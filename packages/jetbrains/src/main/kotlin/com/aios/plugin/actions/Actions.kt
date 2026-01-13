package com.aios.plugin.actions

import com.aios.plugin.AiosService
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.intellij.openapi.ui.Messages

class StartDebateAction : AnAction() {
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val editor = e.getData(CommonDataKeys.EDITOR)
        val selectedText = editor?.selectionModel?.selectedText ?: ""
        
        val topic = Messages.showInputDialog(project, "Enter debate topic:", "Council Debate", null)
        if (topic != null) {
            val service = project.getService(AiosService::class.java)
            service.startDebate(topic, selectedText) { result ->
                Messages.showInfoMessage(project, result, "Debate Result")
            }
        }
    }
}

class ArchitectModeAction : AnAction() {
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val task = Messages.showInputDialog(project, "Enter task for Architect:", "Architect Mode", null)
        if (task != null) {
            val service = project.getService(AiosService::class.java)
            service.startArchitectSession(task) { result ->
                Messages.showInfoMessage(project, result, "Architect Session Started")
            }
        }
    }
}
