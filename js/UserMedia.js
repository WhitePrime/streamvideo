(function(){
    'use strict';

    var mediaStream = null;
    var webcamList  = [];
    var currentCam  = null;
    var photoReady  = false;

    // CSS filters 
    var index     = 0;
    var filters   = ['grayscale', 'sepia', 'blur', 'invert', 'brightness', 'contrast', ''];
    
    // init() - The entry point to the demo code
    // 1. Detect whether getUserMedia() is supported, show an error if not
    // 2. Set up necessary event listners for video tag and the webcam 'switch' button
    // 3. Detect whether device enumeration is supported, use the legacy media capture API to start the demo otherwise
    // 4. Enumerate the webcam devices when the browser supports device enumeration

    var init = function () {
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
        document.getElementById('videoTag')          .addEventListener('click', capture,         false);
        document.getElementById('switch')            .addEventListener('click', nextWebCam,      false);
        document.getElementById('change-vid-filters').addEventListener('click', changeCssFilterOnVid, false);
        document.getElementById('change-img-filters').addEventListener('click', changeCssFilterOnImg, false);

        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
            navigator.mediaDevices.enumerateDevices().then(devicesCallback);
        }
        else if (navigator.getUserMedia) {
            document.getElementById('tooltip').innerHTML = 'Невозможно переключить веб-камеры. navigator.mediaDevices.enumerateDevices не поддерживается вашим браузером.';

            navigator.getUserMedia({ video: true /*, audio: true */ }, initializeVideoStream, getUserMediaError);
        }
        else {
            writeError('Вы используете браузер, который не поддерживает API Media Capture');
        }
    };

    
    // initializeVideoStream() - Callback function when getUserMedia() returns successfully with a mediaStream object
    // 1. Set the mediaStream on the video tag
    // 2. Use 'srcObject' attribute to determine whether to use the standard-based API or the legacy version

    var initializeVideoStream = function(stream) {
        mediaStream = stream;

        var video = document.getElementById('videoTag');
        if (typeof (video.srcObject) !== 'undefined') {
            video.srcObject = mediaStream;
        }
        else {
            video.src = URL.createObjectURL(mediaStream);
        }
        if (webcamList.length > 1) {
            document.getElementById('switch').disabled = false;
        }
    };


    // savePhoto() - Function invoked when user clicks on the canvas element
    // 1. If msSaveBlob is supported, get the photo blob from the canvas and save the image file
    // 2. Otherwise, set up the download attribute of the anchor element and download the image file

    var savePhoto = function() {
        if (photoReady) {
            var canvas = document.getElementById('canvasTag');
            if (navigator.msSaveBlob) {
                var imgData = canvas.msToBlob('image/jpeg');
                navigator.msSaveBlob(imgData, 'mySelfie.jpg');
            }
            else {
                var imgData = canvas.toDataURL('image/jpeg');
                var link    = document.getElementById('saveImg');
                link.href   = imgData;
                link.download = 'mySelfie.jpg';
                link.click();
            }
            canvas.removeEventListener('click', savePhoto);
            document.getElementById('photoViewText').innerHTML = '';
            photoReady = false;
        }
    };


    // capture() - Function called when click on video tag
    // 1. Capture a video frame from the video tag and render on the canvas element
    // 2. Set the H/W of the canvas to match that of the size of the video

    var capture = function() {

        if (!mediaStream) {
            return;
        }

        var video       = document.getElementById('videoTag');
        var canvas      = document.getElementById('canvasTag');
        canvas.removeEventListener('click', savePhoto);
        var videoWidth  = video.videoWidth;
        var videoHeight = video.videoHeight;

        if (canvas.width !== videoWidth || canvas.height !== videoHeight) {
            canvas.width  = videoWidth;
            canvas.height = videoHeight;
        }

        var ctx    = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        photoReady = true;
        document.getElementById('photoViewText').innerHTML = 'Нажмите или нажмите ниже, чтобы сохранить как .jpg';
        canvas.addEventListener('click', savePhoto);

    };


    // nextWebCam() - Function to rotate through the webcam device list
    // 1. Release the current webcam (if there is one in use)
    // 2. Call getUserMedia() to access the next webcam

    var nextWebCam = function() {
        document.getElementById('switch').disabled = true;
        if(currentCam !== null) {
            currentCam++;
            if(currentCam >= webcamList.length) {
                currentCam = 0;
            }
            var video = document.getElementById('videoTag');
            video.srcObject = null;
            video.src = null;
            if(mediaStream) {
                var videoTracks = mediaStream.getVideoTracks();
                videoTracks[0].stop();
                mediaStream = null;
            }
        }
        else {
            currentCam = 0;
        }

        navigator.mediaDevices.getUserMedia({
            video: {
                width: 1280,
                height: 720,
                deviceId: { exact: webcamList[currentCam] }
            }
        }).then(initializeVideoStream)
            .catch(getUserMediaError);
    };

    
    // deviceChanged() - Handle devicechange event
    // 1. Reset webcamList
    // 2. Re-enumerate webcam devices

    var deviceChanged = function() {
        navigator.mediaDevices.removeEventListener('devicechange', deviceChanged);
        // Reset the webcam list and re-enumerate
        webcamList = [];
        /*eslint-disable*/
        navigator.mediaDevices.enumerateDevices().then(devicesCallback);
        /*eslint-enable*/
    };
    

    // devicesCallback() - Callback function for device enumeration
    // 1. Identify all webcam devices and store the info in the webcamList
    // 2. Start the demo with the first webcam on the list
    // 3. Show the webcam 'switch' button when there are multiple webcams
    // 4. Show error message when there is no webcam
    // 5. Register event listener (devicechange) to respond to device plugin or unplug

    var devicesCallback = function(devices) {
        // Identify all webcams
        for (var i = 0; i < devices.length; i++) {
            if (devices[i].kind === 'videoinput') {
                webcamList[webcamList.length] = devices[i].deviceId;
            }
        }

        if (webcamList.length > 0) {
            // Start video with the first device on the list
            nextWebCam();
            if (webcamList.length > 1) {
                document.getElementById('switch').disabled = false;
            }
            else {
                document.getElementById('switch').disabled = true;
            }
        }
        else {
            writeError('Webcam not found.');
        }
        navigator.mediaDevices.addEventListener('devicechange', deviceChanged);
    };


    // writeError(string) - Provides a way to display errors to the user

    var writeError = function (string) {
        var elem = document.getElementById('error');
        var p    = document.createElement('div');
        p.appendChild(document.createTextNode('ERROR: ' + string));
        elem.appendChild(p);
    };


    // getUserMediaError() - Callback function when getUserMedia() returns error
    // 1. Show the error message with the error.name

    var getUserMediaError = function (e) {
        if (e.name.indexOf('NotFoundError') >= 0) {
            writeError('Webcam not found.');
        }
        else {
            writeError('The following error occurred: "' + e.name + '" Проверьте веб-камеру и повторите попытку.');
        }
    };


    // changeCssFiltersOnVid() - Cycle through CSS filters applied to the video stream
    // 1. Grab a reference to the video tag
    // 2. Keep the original CSS classes while still adding the filters
    // 3. Loop through all of the filters

    var changeCssFilterOnVid = function () {
        var el       = document.getElementById('videoTag');
        el.className = 'view--video__video';

        var effect = filters[index++ % filters.length]
        if (effect) {
            el.classList.add(effect);
            console.log(el.classList);
        }
    }


    // changeCssFiltersOnImg() - Cycle through CSS filters applied to the static image
    // 1. Grab a reference to image canvas
    // 2. Keep the original CSS classes while still adding the filters
    // 3. Loop through all of the filters

    var changeCssFilterOnImg = function () {
        var el       = document.getElementById('canvasTag');
        el.className = 'view--snapshot__canvas';

        var effect = filters[index++ % filters.length]
        if (effect) {
            el.classList.add(effect);
            console.log(el.classList);
        }
    }


    init();

}());