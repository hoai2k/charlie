export function createCamera(video) {
  let stream = null;

  return {
    async start() {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 24, max: 30 }
        }
      });

      video.srcObject = stream;
      await video.play();
      return stream;
    },

    stop() {
      for (const track of stream?.getTracks() ?? []) {
        track.stop();
      }
      stream = null;
      video.srcObject = null;
    }
  };
}
