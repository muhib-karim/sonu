cmake_minimum_required(VERSION 3.18)

project(sonu-whisper)

set(CMAKE_CXX_STANDARD 17)

# Path to whisper.cpp submodule (relative to this CMakeLists.txt)
set(WHISPER_CPP_DIR ${CMAKE_CURRENT_SOURCE_DIR}/../../whisper.cpp)

# Add whisper.cpp subdirectory
add_subdirectory(${WHISPER_CPP_DIR} ${CMAKE_CURRENT_BINARY_DIR}/whisper.cpp.build)

add_library(sonu-whisper SHARED
    src/main/cpp/whisper-jni.cpp
)

target_include_directories(sonu-whisper PRIVATE
    ${WHISPER_CPP_DIR}/include
)

target_link_libraries(sonu-whisper
    whisper
    android
    log
)

