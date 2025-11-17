//
//  ContentView.swift
//  Sonu
//
//  Main view for the transcription app
//

import SwiftUI

struct ContentView: View {
    @StateObject private var viewModel = TranscriptionViewModel()
    @State private var showModelDialog = false
    @State private var hasMicrophonePermission = false
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                // Status
                Text(viewModel.status)
                    .font(.headline)
                    .foregroundColor(.secondary)
                    .padding()
                
                // Download Model Button
                Button(action: {
                    showModelDialog = true
                }) {
                    Text("Download Model")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(10)
                }
                .padding(.horizontal)
                
                // Progress Bar
                if viewModel.isDownloading {
                    ProgressView(value: viewModel.downloadProgress)
                        .padding(.horizontal)
                }
                
                // Record Button
                Button(action: {
                    if viewModel.isRecording {
                        viewModel.stopRecording()
                    } else {
                        if hasMicrophonePermission {
                            viewModel.startRecording()
                        } else {
                            viewModel.requestMicrophonePermission { granted in
                                hasMicrophonePermission = granted
                                if granted {
                                    viewModel.startRecording()
                                }
                            }
                        }
                    }
                }) {
                    Text(viewModel.isRecording ? "Stop Recording" : "Record")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(viewModel.isRecording ? Color.red : Color.green)
                        .foregroundColor(.white)
                        .cornerRadius(10)
                }
                .padding(.horizontal)
                .disabled(!viewModel.isModelLoaded)
                
                // Transcribe Button
                Button(action: {
                    viewModel.transcribe()
                }) {
                    Text("Transcribe")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.purple)
                        .foregroundColor(.white)
                        .cornerRadius(10)
                }
                .padding(.horizontal)
                .disabled(!viewModel.isModelLoaded || viewModel.isRecording)
                
                // Transcription Result
                ScrollView {
                    Text(viewModel.transcription.isEmpty ? "Transcription will appear here..." : viewModel.transcription)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding()
                        .background(Color.gray.opacity(0.1))
                        .cornerRadius(10)
                }
                .padding(.horizontal)
                
                Spacer()
            }
            .padding()
            .navigationTitle("Sonu Transcription")
            .sheet(isPresented: $showModelDialog) {
                ModelSelectionView(viewModel: viewModel)
            }
            .onAppear {
                checkMicrophonePermission()
            }
        }
    }
    
    private func checkMicrophonePermission() {
        AVAudioSession.sharedInstance().requestRecordPermission { granted in
            DispatchQueue.main.async {
                hasMicrophonePermission = granted
            }
        }
    }
}

struct ModelSelectionView: View {
    @ObservedObject var viewModel: TranscriptionViewModel
    @Environment(\.presentationMode) var presentationMode
    
    var body: some View {
        NavigationView {
            List {
                ForEach(TranscriptionViewModel.ModelType.allCases, id: \.self) { modelType in
                    Button(action: {
                        viewModel.downloadModel(modelType) { success in
                            if success {
                                presentationMode.wrappedValue.dismiss()
                            }
                        }
                    }) {
                        HStack {
                            Text(modelType.displayName)
                            Spacer()
                            if viewModel.isDownloading && viewModel.currentModel == modelType {
                                ProgressView()
                            }
                        }
                    }
                }
            }
            .navigationTitle("Select Model")
            .navigationBarItems(trailing: Button("Cancel") {
                presentationMode.wrappedValue.dismiss()
            })
        }
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}

