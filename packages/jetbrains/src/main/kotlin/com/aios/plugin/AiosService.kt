package com.aios.plugin

import com.google.gson.Gson
import com.intellij.openapi.components.Service
import com.intellij.openapi.project.Project
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.util.concurrent.TimeUnit

@Service(Service.Level.PROJECT)
class AiosService(private val project: Project) {
    private val client = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()
    
    private val gson = Gson()
    private val hubUrl = "http://localhost:3000"
    private val jsonMediaType = "application/json; charset=utf-8".toMediaType()

    data class DebateRequest(val task: Map<String, Any>)
    data class ArchitectRequest(val task: String, val context: String? = null)

    fun startDebate(description: String, context: String, callback: (String) -> Unit) {
        val requestBody = gson.toJson(DebateRequest(mapOf(
            "id" to "jb-${System.currentTimeMillis()}",
            "description" to description,
            "files" to emptyList<String>(),
            "context" to context
        ))).toRequestBody(jsonMediaType)

        val request = Request.Builder()
            .url("$hubUrl/api/council/debate")
            .post(requestBody)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                callback("Error: ${e.message}")
            }

            override fun onResponse(call: Call, response: Response) {
                callback(response.body?.string() ?: "Empty response")
            }
        })
    }

    fun startArchitectSession(task: String, callback: (String) -> Unit) {
        val requestBody = gson.toJson(ArchitectRequest(task)).toRequestBody(jsonMediaType)
        val request = Request.Builder()
            .url("$hubUrl/api/architect/sessions")
            .post(requestBody)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                callback("Error: ${e.message}")
            }

            override fun onResponse(call: Call, response: Response) {
                callback(response.body?.string() ?: "Empty response")
            }
        })
    }

    fun getAnalyticsSummary(callback: (String) -> Unit) {
        val request = Request.Builder()
            .url("$hubUrl/api/supervisor-analytics/summary")
            .get()
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                callback("Error: ${e.message}")
            }

            override fun onResponse(call: Call, response: Response) {
                callback(response.body?.string() ?: "Empty response")
            }
        })
    }
}
