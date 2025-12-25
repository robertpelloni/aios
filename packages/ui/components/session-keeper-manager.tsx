'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useJules } from '@/lib/jules/provider';
import { useSessionKeeperStore } from '@/lib/stores/session-keeper';
import { Activity } from '@/types/jules';

export function SessionKeeperManager() {
  const { client } = useJules();
  const router = useRouter();
  const { config, addLog, setStatusSummary, incrementStat } = useSessionKeeperStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!config.isEnabled || !client) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const checkSessions = async () => {
      try {
        const sessions = await client.listSessions();

        setStatusSummary({
          monitoringCount: sessions.length,
          lastAction: 'Checked ' + new Date().toLocaleTimeString(),
          nextCheckIn: config.checkIntervalSeconds
        });

        for (const session of sessions) {
          // Optimization: Fetch ONLY the latest activity to check timestamp
          let activities: Activity[] = [];
          try {
             // Fetch 1 activity
             const result = await client.listActivitiesPaged(session.id, 1);
             activities = result.activities;
          } catch (e) {
             console.error(`Failed to list activities for ${session.id}`, e);
             continue;
          }

          if (activities.length === 0) {
             continue;
          }

          const lastActivityTimeStr = session.lastActivityAt || session.updatedAt;
          const lastActivityTime = new Date(lastActivityTimeStr).getTime();
          const now = Date.now();
          const inactiveMinutes = (now - lastActivityTime) / (1000 * 60);

          // Determine threshold
          let threshold = config.inactivityThresholdMinutes;
          const isAgentWorking = ['IN_PROGRESS', 'PLANNING'].includes(session.rawState || '');
          if (isAgentWorking) {
             threshold = config.activeWorkThresholdMinutes;
          }

          const switchToSession = () => {
             if (config.autoSwitch) {
                 const currentParams = new URLSearchParams(window.location.search);
                 if (currentParams.get('sessionId') !== session.id) {
                     router.push(`/?sessionId=${session.id}`);
                 }
             }
          };

          // 1. Check for Plan Approval (Needs fetching activities)
          if (session.status === 'awaiting_approval' || session.rawState === 'AWAITING_PLAN_APPROVAL') {
             addLog(`Approving plan for session ${session.id} (State: Awaiting Approval)`, 'action');
             switchToSession();
             await client.approvePlan(session.id);
             incrementStat('totalApprovals');
             continue;
          }

          // 2. Check for Inactivity
          if (inactiveMinutes > threshold) {
             let message = '';

             // Now we need context. FETCH FULL HISTORY (or enough context).
             const fullActivities = await client.listActivities(session.id);
             fullActivities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
             const latestActivity = fullActivities[0];

             // Double check plan approval on latest activity
             if (latestActivity.type === 'plan' && !latestActivity.metadata?.planApproved) {
                 addLog(`Approving plan for session ${session.id} (Found unapproved plan)`, 'action');
                 switchToSession();
                 await client.approvePlan(session.id);
                 incrementStat('totalApprovals');
                 continue;
             }

             switchToSession();

             // 1. DEBATE MODE
             if (config.debateEnabled && config.debateParticipants && config.debateParticipants.length > 0) {
                addLog(`Convening Council for ${session.id}...`, 'info');
                try {
                    const contextActivities = [...fullActivities].reverse().slice(-config.contextMessageCount);
                    const history = contextActivities.map(a => ({
                        role: a.role === 'agent' ? 'assistant' : 'user',
                        content: a.content
                    }));

                    const response = await fetch('/api/supervisor', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'debate',
                            messages: history,
                            participants: config.debateParticipants
                        })
                    });

                    if (response.ok) {
                        const data = await response.json();

                        // Construct Rich Markdown Transcript
                        let transcript = `### 🏛️ Council Debate\n\n`;
                        if (data.opinions && Array.isArray(data.opinions)) {
                            data.opinions.forEach((op: any) => {
                                const role = op.participant?.role || op.participant?.model || 'Member';
                                const provider = op.participant?.provider ? `(${op.participant.provider})` : '';
                                transcript += `**${role}** ${provider}:\n> ${op.content.replace(/\n/g, '\n> ')}\n\n`;
                            });
                        }
                        transcript += `\n---\n**Verdict:**\n${data.content}`;

                        message = transcript;
                        addLog(`Council Verdict: "${data.content.substring(0, 30)}..."`, 'action');
                        incrementStat('totalDebates');
                    } else {
                        addLog('Council debate failed, falling back.', 'error');
                    }
                } catch (e) {
                    addLog(`Council error: ${e}`, 'error');
                }
             }

             // 2. SMART PILOT (Single Supervisor)
             if (!message && config.smartPilotEnabled && config.supervisorApiKey) {
                addLog(`Consulting Supervisor for ${session.id}...`, 'info');
                try {
                  const contextActivities = [...fullActivities].reverse().slice(-config.contextMessageCount);
                  const messages = contextActivities.map(a => ({
                      role: a.role === 'agent' ? 'assistant' : 'user',
                      content: a.content
                  }));

                  const response = await fetch('/api/supervisor', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        messages,
                        provider: config.supervisorProvider,
                        apiKey: config.supervisorApiKey,
                        model: config.supervisorModel
                    })
                  });

                  if (response.ok) {
                    const data = await response.json();
                    if (data.content) {
                        message = data.content;
                    }
                  } else {
                     addLog(`Supervisor API failed: ${response.status}`, 'error');
                  }
                } catch (e) {
                  addLog(`Supervisor failed: ${e}`, 'error');
                }
             }

             // 3. FALLBACK MESSAGES
             if (!message) {
                 if (config.customMessages[session.id] && config.customMessages[session.id].length > 0) {
                    const customList = config.customMessages[session.id];
                    message = customList[Math.floor(Math.random() * customList.length)];
                 } else {
                    message = config.messages[Math.floor(Math.random() * config.messages.length)];
                 }

                 if (session.status === 'completed' || session.status === 'failed') {
                    message = "Please resume working on this task.";
                 }
             }

             addLog(`Sending nudge to ${session.id} (${inactiveMinutes.toFixed(1)}m > ${threshold}m): "${message.substring(0, 50)}..."`, 'action');
             await client.createActivity({
               sessionId: session.id,
               content: message,
               type: 'message'
             });
             incrementStat('totalNudges');
          }
        }

      } catch (error) {
        addLog(`Error checking sessions: ${error}`, 'error');
      }
    };

    checkSessions();
    intervalRef.current = setInterval(checkSessions, config.checkIntervalSeconds * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [config, client, addLog, setStatusSummary, router, incrementStat]);

  return null;
}
