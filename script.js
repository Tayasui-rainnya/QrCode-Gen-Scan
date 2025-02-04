// 历史记录数据
let historyData = {
    generated: [],
    scanned: []
};

// 获取历史记录元素
const generatedList = document.getElementById('generated-list');
const scannedList = document.getElementById('scanned-list');

// 获取清除历史记录按钮
const clearGenerateHistoryBtn = document.getElementById('clear-generate-history-btn');
const clearScanHistoryBtn = document.getElementById('clear-scan-history-btn');

// 获取个性化选项元素
const qrContentInput = document.getElementById('qr-content'); // 新增二维码内容输入框
const qrSizeInput = document.getElementById('qr-size');
const qrColorDarkInput = document.getElementById('qr-color-dark');
const qrColorLightInput = document.getElementById('qr-color-light');
const qrLogoInput = document.getElementById('qr-logo');
const qrErrorSelect = document.getElementById('qr-error');
const qrLogoOpacityInput = document.getElementById('qr-logo-opacity');

// 获取二维码预览和下载按钮
const qrPreview = document.getElementById('qr-preview');
const downloadBtn = document.getElementById('download-btn');

// 获取扫描相关元素
const startRealTimeScanBtn = document.getElementById('start-real-time-scan-btn');
const stopRealTimeScanBtn = document.getElementById('stop-real-time-scan-btn');
const scanSpeedSlider = document.getElementById('scan-speed-slider');
const scanSpeedValue = document.getElementById('scan-speed-value');
const realTimeResultsTextarea = document.getElementById('real-time-results-textarea');
const copyResultsBtn = document.getElementById('copy-results-btn');
const exportResultsBtn = document.getElementById('export-results-btn');
const clearResultsBtn = document.getElementById('clear-results-btn'); // 获取清空按钮

// 获取摄像头扫描相关元素
const cameraScanBtn = document.getElementById('camera-scan-btn');
const cameraScanSection = document.getElementById('camera-scan-section');
const cameraVideo = document.getElementById('camera-video');
const cameraCanvas = document.getElementById('camera-canvas');
const stopCameraBtn = document.getElementById('stop-camera-btn');

// 获取上传图片扫描相关元素
const uploadScanBtn = document.getElementById('upload-scan-btn');
const uploadScanSection = document.getElementById('upload-scan-section');
const uploadInput = document.getElementById('upload-input');
const uploadCanvas = document.getElementById('upload-canvas');
const uploadResult = document.getElementById('upload-result');

// 获取批量下载按钮
const batchDownloadBtn = document.getElementById('batch-download-btn');

// 使用ZXing
const codeReader = new ZXing.BrowserMultiFormatReader();

// 存储Logo图像
let qrLogo = null;

// 存储实时扫描相关变量
let realTimeStream = null;
let realTimeTimeout = null;
let realTimeScanning = false;

// 存储摄像头扫描相关变量
let cameraStream = null;
let cameraScanning = false;

// 用于去重的Set
const recognizedResultsSet = new Set();

// 音频加载状态
let isAudioLoaded = false;

// 加载声音提示
const scanSound = new Audio('audio.mp3');

// 异步加载音频文件
scanSound.addEventListener('canplaythrough', () => {
    isAudioLoaded = true;
}, false);

scanSound.addEventListener('error', (e) => {
    isAudioLoaded = false;
    console.error('audio.mp3 加载失败:', e);
}, false);

// 监听Logo上传
qrLogoInput.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            qrLogo = e.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// 生成二维码
document.getElementById('generate-btn').addEventListener('click', function() {
    let input = qrContentInput.value.trim(); // 获取输入框内容并去除前后空格
    if (!input) {
        // 输入框为空时弹出prompt提示
        input = prompt('请输入要生成二维码的内容:');
        if (input) {
            qrContentInput.value = input.trim(); // 将prompt输入的内容填入输入框
        } else {
            alert('二维码内容不能为空。');
            return; // 终止生成二维码
        }
    }
    const size = parseInt(qrSizeInput.value) || 200;
    const colorDark = qrColorDarkInput.value || '#000000';
    const colorLight = qrColorLightInput.value || '#ffffff';
    const errorLevel = qrErrorSelect.value || 'M';
    const logoOpacity = parseFloat(qrLogoOpacityInput.value) || 1;

    QRCode.toCanvas(qrPreview, input, {
        width: size,
        color: {
            dark: colorDark,
            light: colorLight
        },
        errorCorrectionLevel: errorLevel
    }, function (error) {
        if (error) {
            console.error(error);
            alert('生成二维码失败。');
        } else {
            qrPreview.style.display = 'block';
            downloadBtn.style.display = 'inline-block';
            // 如果有Logo，绘制Logo到二维码中心
            if (qrLogo) {
                const canvas = qrPreview;
                const ctx = canvas.getContext('2d');
                const logoImage = new Image();
                logoImage.src = qrLogo;
                logoImage.onload = function() {
                    const logoWidth = size * 0.2;
                    const logoHeight = logoWidth;
                    ctx.globalAlpha = logoOpacity;
                    ctx.drawImage(logoImage, (canvas.width - logoWidth) / 2, (canvas.height - logoHeight) / 2, logoWidth, logoHeight);
                    ctx.globalAlpha = 1.0;
                };
            }

            // 保存生成的二维码到历史记录
            const qrDataURL = qrPreview.toDataURL();
            historyData.generated.push({ text: input, image: qrDataURL });
            appendGeneratedHistoryItem(input, qrDataURL);
            saveHistory();
        }
    });
});

// 下载生成的二维码
downloadBtn.addEventListener('click', function() {
    const link = document.createElement('a');
    link.href = qrPreview.toDataURL();
    link.download = 'qrcode.png';
    link.click();
});

// 清空扫描结果
clearResultsBtn.addEventListener('click', function() {
    realTimeResultsTextarea.value = '';
    recognizedResultsSet.clear();
});

// 清除生成历史记录
clearGenerateHistoryBtn.addEventListener('click', function() {
    if (confirm('确定要清除所有生成的二维码历史记录吗？')) {
        historyData.generated = [];
        generatedList.innerHTML = '';
        saveHistory();
    }
});

// 清除扫描历史记录
clearScanHistoryBtn.addEventListener('click', function() {
    if (confirm('确定要清除所有扫描的二维码历史记录吗？')) {
        historyData.scanned = [];
        scannedList.innerHTML = '';
        recognizedResultsSet.clear();
        realTimeResultsTextarea.value = '';
        saveHistory();
    }
});

// 批量下载二维码
batchDownloadBtn.addEventListener('click', function() {
    if (historyData.generated.length === 0) {
        alert('没有生成的二维码可供下载。');
        return;
    }
    const zip = new JSZip();
    historyData.generated.forEach((item, index) => {
        const imgData = item.image.split(',')[1];
        zip.file(`qrcode_${index + 1}.png`, imgData, {base64: true});
    });
    zip.generateAsync({type:"blob"})
    .then(function(content) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = 'qrcodes.zip';
        link.click();
    });
});

// 复制扫描结果
copyResultsBtn.addEventListener('click', function() {
    realTimeResultsTextarea.select();
    document.execCommand('copy');
    alert('扫描结果已复制到剪贴板。');
});

// 导出扫描结果
exportResultsBtn.addEventListener('click', function() {
    const text = realTimeResultsTextarea.value;
    if (!text) {
        alert('没有扫描结果可导出。');
        return;
    }
    const blob = new Blob([text], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'scan_results.txt';
    link.click();
});

// 切换到上传图片扫描
uploadScanBtn.addEventListener('click', function() {
    uploadScanSection.style.display = 'block';
    cameraScanSection.style.display = 'none';
    realTimeScanSection.style.display = 'none';
    startRealTimeScanBtn.disabled = true;
});

// 切换到摄像头扫描
cameraScanBtn.addEventListener('click', function() {
    cameraScanSection.style.display = 'block';
    uploadScanSection.style.display = 'none';
    realTimeScanSection.style.display = 'none';
    startRealTimeScanBtn.disabled = true;
});


/**
 * 开始摄像头扫描
 */
cameraScanBtn.addEventListener('click', function() {
    cameraScanBtn.disabled = true;
    cameraScanning = true;

    codeReader.decodeFromVideoDevice(null, 'camera-video', (result, err) => {
        if (result) {
            appendScanResult(result.getText());
        }
        if (err && !(err instanceof ZXing.NotFoundException)) {
            console.error(err);
        }
    })
    .then((result) => {
        cameraStream = result;
    })
    .catch(err => {
        console.error(err);
    });
});

/**
 * 停止摄像头扫描
 */
stopCameraBtn.addEventListener('click', function() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    cameraScanSection.style.display = 'none';
    cameraScanning = false;
    cameraScanBtn.disabled = false;
});

/**
 * 开始实时屏幕扫描
 */
startRealTimeScanBtn.addEventListener('click', function() {
    realTimeScanning = true;
    startRealTimeScanBtn.disabled = true;
    stopRealTimeScanBtn.disabled = false;
    performRealTimeScan();
});

/**
 * 执行实时屏幕扫描
 */
function performRealTimeScan() {
    navigator.mediaDevices.getDisplayMedia({ video: true }).then(stream => {
        realTimeStream = stream;
        const video = document.createElement('video');
        video.srcObject = stream;
        video.play();

        video.onloadedmetadata = () => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');

            function scanFrame() {
                if (!realTimeScanning) return;
                context.drawImage(video, 0, 0, canvas.width, canvas.height);

                // 将canvas转化为图像元素，然后解码
                const img = new Image();
                img.src = canvas.toDataURL(); // 将canvas转换为base64 URL
                img.onload = () => {
                    // 使用ZXing的decodeFromImageElement来解码二维码
                    codeReader.decodeFromImageElement(img).then(result => {
                        if (result) {
                            appendScanResult(result.getText()); // 处理扫描结果
                        }
                    }).catch(err => {
                        // ZXing解码失败时的处理
                        if (err instanceof ZXing.NotFoundException) {
                            // 不处理，继续扫描
                        } else {
                            console.error('ZXing解码失败:', err);
                        }
                    });
                };

                const scanInterval = parseInt(scanSpeedSlider.value);
                realTimeTimeout = setTimeout(scanFrame, scanInterval);
            }

            scanFrame();
        };
    }).catch(err => {
        console.error('获取屏幕视频失败:', err);
    });
}

/**
 * 停止实时屏幕扫描
 */
stopRealTimeScanBtn.addEventListener('click', function() {
    realTimeScanning = false;
    startRealTimeScanBtn.disabled = false;
    stopRealTimeScanBtn.disabled = true;
    if (realTimeStream) {
        realTimeStream.getTracks().forEach(track => track.stop());
        realTimeStream = null;
    }
    if (realTimeTimeout) {
        clearTimeout(realTimeTimeout);
    }
});

// 监听扫描速度滑块变化
scanSpeedSlider.addEventListener('input', function() {
    scanSpeedValue.textContent = scanSpeedSlider.value;
});

// 监听Logo上传
qrLogoInput.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            qrLogo = e.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// 上传图片扫描
uploadInput.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.src = e.target.result;
            img.onload = function() {
                uploadCanvas.width = img.width;
                uploadCanvas.height = img.height;
                const ctx = uploadCanvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, uploadCanvas.width, uploadCanvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);
                if (code) {
                    appendScanResult(code.data);
                    uploadResult.textContent = '二维码内容：' + code.data;
                } else {
                    uploadResult.textContent = '未检测到二维码。';
                }
            };
        };
        reader.readAsDataURL(file);
    }
});

// 添加生成历史记录项
function appendGeneratedHistoryItem(text, image) {
    const li = document.createElement('li');
    li.classList.add('generated-item');

    const img = document.createElement('img');
    img.src = image;
    li.appendChild(img);

    const span = document.createElement('span');
    span.classList.add('item-text');
    span.textContent = text;
    li.appendChild(span);

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '删除';
    deleteBtn.addEventListener('click', function() {
        if (confirm('确定要删除此二维码记录吗？')) {
            const index = historyData.generated.findIndex(item => item.image === image);
            if (index !== -1) {
                historyData.generated.splice(index, 1);
                generatedList.removeChild(li);
                saveHistory();
            }
        }
    });
    li.appendChild(deleteBtn);

    generatedList.appendChild(li);
}

// 添加扫描历史记录项
function appendScanHistoryItem(text) {
    const li = document.createElement('li');
    li.textContent = text;
    scannedList.appendChild(li);
}

// 添加扫描结果
function appendScanResult(text) {
    if (!recognizedResultsSet.has(text)) {
        recognizedResultsSet.add(text);
        realTimeResultsTextarea.value += text + '\n';
        appendScanHistoryItem(text);
        historyData.scanned.push(text);
        saveHistory();

        // 播放声音提示
        if (isAudioLoaded) {
            scanSound.play().catch(err => {
                console.error('播放音频失败:', err);
            });
        }
    }
}

/**
 * 加载历史记录
 */
function loadHistory() {
    const storedHistory = localStorage.getItem('qr_history');
    if (storedHistory) {
        historyData = JSON.parse(storedHistory);
        // 加载生成历史
        historyData.generated.forEach(item => {
            appendGeneratedHistoryItem(item.text, item.image);
        });
        // 加载扫描历史
        historyData.scanned.forEach(item => {
            appendScanHistoryItem(item);
        });
    }
}

// 初始化应用
window.onload = function() {
    loadHistory();

    // 检测是否为移动设备
    if (isMobileDevice()) {
        const realTimeScanSection = document.getElementById('real-time-scan-section');
        if (realTimeScanSection) {
            realTimeScanSection.style.display = 'none';
            
            // 显示提示信息
            const scannerSection = document.getElementById('qr-scanner');
            const infoMessage = document.createElement('p');
            infoMessage.textContent = '实时屏幕扫描功能在移动设备上不可用。';
            infoMessage.classList.add('info-message');
            scannerSection.appendChild(infoMessage);
        }
    }
}

/**
 * 保存历史记录到localStorage
 */
function saveHistory() {
    localStorage.setItem('qr_history', JSON.stringify(historyData));
}

/**
 * 检测是否为移动设备
 */
function isMobileDevice() {
    return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}