package com.aios.plugin

import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.ui.content.ContentFactory
import java.awt.BorderLayout
import javax.swing.*

class AiosToolWindowFactory : ToolWindowFactory {
    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        val panel = JPanel(BorderLayout())
        val textArea = JTextArea("AIOS Hub Status: Connected\n\nWaiting for activity...")
        textArea.isEditable = false
        
        val scrollPane = JScrollPane(textArea)
        panel.add(scrollPane, BorderLayout.CENTER)
        
        val bottomPanel = JPanel()
        val refreshButton = JButton("Refresh")
        refreshButton.addActionListener {
            textArea.append("\nRefreshing state...")
        }
        bottomPanel.add(refreshButton)
        panel.add(bottomPanel, BorderLayout.SOUTH)

        val content = ContentFactory.getInstance().createContent(panel, "", false)
        toolWindow.contentManager.addContent(content)
    }
}
