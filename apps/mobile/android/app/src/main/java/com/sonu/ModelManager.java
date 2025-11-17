package com.sonu;

import android.content.Context;
import android.util.Log;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Manages whisper model downloads and storage
 */
public class ModelManager {
    private static final String TAG = "ModelManager";
    private static final String MODEL_DIR = "whisper_models";
    
    // Model URLs from HuggingFace
    private static final String BASE_URL = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/";
    
    public enum ModelType {
        TINY("ggml-tiny.bin", "ggml-tiny.bin", 75),
        BASE("ggml-base.bin", "ggml-base.bin", 142),
        SMALL("ggml-small.bin", "ggml-small.bin", 466);
        
        public final String filename;
        public final String urlPath;
        public final int sizeMB;
        
        ModelType(String filename, String urlPath, int sizeMB) {
            this.filename = filename;
            this.urlPath = urlPath;
            this.sizeMB = sizeMB;
        }
    }
    
    private Context context;
    
    public ModelManager(Context context) {
        this.context = context;
    }
    
    /**
     * Get the model file path
     * @param modelType Model type to get path for
     * @return File object for the model
     */
    public File getModelFile(ModelType modelType) {
        File modelDir = new File(context.getFilesDir(), MODEL_DIR);
        if (!modelDir.exists()) {
            modelDir.mkdirs();
        }
        return new File(modelDir, modelType.filename);
    }
    
    /**
     * Check if model is downloaded
     * @param modelType Model type to check
     * @return true if model exists
     */
    public boolean isModelDownloaded(ModelType modelType) {
        File modelFile = getModelFile(modelType);
        return modelFile.exists() && modelFile.length() > 0;
    }
    
    /**
     * Download a model
     * @param modelType Model type to download
     * @param progressCallback Callback for download progress (0-100)
     * @return true if download successful
     */
    public boolean downloadModel(ModelType modelType, ProgressCallback progressCallback) {
        File modelFile = getModelFile(modelType);
        
        if (modelFile.exists()) {
            Log.d(TAG, "Model already exists: " + modelFile.getAbsolutePath());
            if (progressCallback != null) {
                progressCallback.onProgress(100);
            }
            return true;
        }
        
        String urlString = BASE_URL + modelType.urlPath;
        Log.d(TAG, "Downloading model from: " + urlString);
        
        try {
            URL url = new URL(urlString);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("GET");
            connection.setConnectTimeout(10000);
            connection.setReadTimeout(30000);
            
            int responseCode = connection.getResponseCode();
            if (responseCode != HttpURLConnection.HTTP_OK) {
                Log.e(TAG, "HTTP error: " + responseCode);
                return false;
            }
            
            long contentLength = connection.getContentLengthLong();
            Log.d(TAG, "Content length: " + contentLength);
            
            // Create parent directory
            if (modelFile.getParentFile() != null) {
                modelFile.getParentFile().mkdirs();
            }
            
            try (InputStream input = connection.getInputStream();
                 FileOutputStream output = new FileOutputStream(modelFile)) {
                
                byte[] buffer = new byte[8192];
                long totalBytesRead = 0;
                int bytesRead;
                
                while ((bytesRead = input.read(buffer)) != -1) {
                    output.write(buffer, 0, bytesRead);
                    totalBytesRead += bytesRead;
                    
                    if (progressCallback != null && contentLength > 0) {
                        int progress = (int) ((totalBytesRead * 100) / contentLength);
                        progressCallback.onProgress(progress);
                    }
                }
                
                if (progressCallback != null) {
                    progressCallback.onProgress(100);
                }
                
                Log.d(TAG, "Model downloaded successfully: " + modelFile.getAbsolutePath());
                return true;
            }
            
        } catch (IOException e) {
            Log.e(TAG, "Error downloading model", e);
            if (modelFile.exists()) {
                modelFile.delete();
            }
            return false;
        }
    }
    
    /**
     * Delete a model file
     * @param modelType Model type to delete
     * @return true if deleted successfully
     */
    public boolean deleteModel(ModelType modelType) {
        File modelFile = getModelFile(modelType);
        if (modelFile.exists()) {
            return modelFile.delete();
        }
        return false;
    }
    
    /**
     * Get model file size in bytes
     * @param modelType Model type
     * @return File size in bytes, or 0 if not found
     */
    public long getModelSize(ModelType modelType) {
        File modelFile = getModelFile(modelType);
        if (modelFile.exists()) {
            return modelFile.length();
        }
        return 0;
    }
    
    public interface ProgressCallback {
        void onProgress(int progress);
    }
}

