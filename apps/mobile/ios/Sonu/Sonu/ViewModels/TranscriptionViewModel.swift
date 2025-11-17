//
//  TranscriptionViewModel.swift
//  Sonu
//
//  ViewModel for managing transcription state and operations
//

import Foundation
import AVFoundation
import Combine

class TranscriptionViewModel: ObservableObject {
    @Published var status: String = "Ready"
    @Published var transcription: String = ""
    @Published var isRecording: Bool = false
    @Published var isProcessing: Bool = false
    @Published var isModelLoaded: Bool = false
    @Published var downloadProgress: Double = 0.0
    @Published var isDownloading: Bool = false
    
    private let whisperBridge = WhisperBridge()
    private var audioRecorder: AVAudioRecorder?
    private var recordingURL: URL?
    private var currentModel: ModelType = .tiny
    
    enum ModelType: String, CaseIterable {
        case tiny = "ggml-tiny.bin"
        case base = "ggml-base.bin"
        case small = "ggml-small.bin"
        
        var displayName: String {
            switch self {
            case .tiny: return "Tiny (75MB)"
            case .base: return "Base (142MB)"
            case .small: return "Small (466MB)"
            }
        }
    }
    
    init() {
        checkModelStatus()
    }
    
    func checkModelStatus() {
        if let modelPath = getModelPath(for: currentModel) {
            if FileManager.default.fileExists(atPath: modelPath) {
                loadModel(path: modelPath)
            } else {
                status = "Model not loaded. Please download a model."
            }
        }
    }
    
    func loadModel(path: String) {
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self = self else { return }
            let success = self.whisperBridge.initContext(path)
            
            DispatchQueue.main.async {
                if success {
                    self.isModelLoaded = true
                    self.status = "Model loaded: \(self.currentModel.rawValue)"
                } else {
                    self.isModelLoaded = false
                    self.status = "Failed to load model"
                }
            }
        }
    }
    
    func downloadModel(_ modelType: ModelType, completion: @escaping (Bool) -> Void) {
        currentModel = modelType
        isDownloading = true
        downloadProgress = 0.0
        status = "Downloading model: \(modelType.displayName)"
        
        // Model download URL
        let urlString = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/\(modelType.rawValue)"
        guard let url = URL(string: urlString) else {
            completion(false)
            return
        }
        
        let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let modelPath = documentsPath.appendingPathComponent("whisper_models")
        
        try? FileManager.default.createDirectory(at: modelPath, withIntermediateDirectories: true)
        
        let destinationURL = modelPath.appendingPathComponent(modelType.rawValue)
        
        URLSession.shared.downloadTask(with: url) { [weak self] tempURL, response, error in
            guard let self = self, let tempURL = tempURL, error == nil else {
                DispatchQueue.main.async {
                    self?.isDownloading = false
                    self?.status = "Download failed"
                    completion(false)
                }
                return
            }
            
            do {
                if FileManager.default.fileExists(atPath: destinationURL.path) {
                    try FileManager.default.removeItem(at: destinationURL)
                }
                try FileManager.default.moveItem(at: tempURL, to: destinationURL)
                
                DispatchQueue.main.async {
                    self.isDownloading = false
                    self.downloadProgress = 1.0
                    self.loadModel(path: destinationURL.path)
                    completion(true)
                }
            } catch {
                DispatchQueue.main.async {
                    self.isDownloading = false
                    self.status = "Failed to save model"
                    completion(false)
                }
            }
        }.resume()
    }
    
    func requestMicrophonePermission(completion: @escaping (Bool) -> Void) {
        AVAudioSession.sharedInstance().requestRecordPermission { granted in
            DispatchQueue.main.async {
                completion(granted)
            }
        }
    }
    
    func startRecording() {
        let audioSession = AVAudioSession.sharedInstance()
        
        do {
            try audioSession.setCategory(.record, mode: .default)
            try audioSession.setActive(true)
        } catch {
            status = "Failed to setup audio session"
            return
        }
        
        let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        recordingURL = documentsPath.appendingPathComponent("recording.wav")
        
        let settings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatLinearPCM),
            AVSampleRateKey: 16000,
            AVNumberOfChannelsKey: 1,
            AVLinearPCMBitDepthKey: 16,
            AVLinearPCMIsBigEndianKey: false,
            AVLinearPCMIsFloatKey: false
        ]
        
        guard let recordingURL = recordingURL else { return }
        
        do {
            audioRecorder = try AVAudioRecorder(url: recordingURL, settings: settings)
            audioRecorder?.record()
            isRecording = true
            status = "Recording..."
        } catch {
            status = "Failed to start recording"
        }
    }
    
    func stopRecording() {
        audioRecorder?.stop()
        audioRecorder = nil
        isRecording = false
        status = "Recording stopped"
    }
    
    func transcribe() {
        guard let recordingURL = recordingURL,
              FileManager.default.fileExists(atPath: recordingURL.path) else {
            status = "No recording found"
            return
        }
        
        guard whisperBridge.isInitialized() else {
            status = "Model not initialized"
            return
        }
        
        isProcessing = true
        status = "Transcribing..."
        transcription = ""
        
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self = self else { return }
            let result = self.whisperBridge.transcribe(recordingURL.path)
            
            DispatchQueue.main.async {
                self.isProcessing = false
                if result.hasPrefix("Error:") {
                    self.status = "Transcription failed"
                    self.transcription = result
                } else {
                    self.transcription = result
                    self.status = "Transcription complete"
                }
            }
        }
    }
    
    private func getModelPath(for modelType: ModelType) -> String? {
        let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let modelPath = documentsPath.appendingPathComponent("whisper_models/\(modelType.rawValue)")
        return modelPath.path
    }
    
    deinit {
        if whisperBridge.isInitialized() {
            whisperBridge.freeContext()
        }
    }
}

