# 音を作る:BGM(頭から)+効果音を秒数に置く → loudnorm -15 LUFS
# 使い方: python3 mix.py <長さ秒> <出力.wav>   (EVENTS を書き換える)
import subprocess, numpy as np, glob, sys
SR = 48000; D = float(sys.argv[1]); OUT = sys.argv[2]
K = '/home/claude/sfx_src/sfx-kit/sounds/'           # git clone --depth 1 https://github.com/wyzowl/sfx-kit
BGM = '/home/claude/bgm_user/bgm_pale_horizon_35.mp3'  # ドライブ「もしも素材_効果音」から取り出す
EVENTS = [  # (秒, ファイル, 音量)
  (0.05, K+'whooshes/whoosh-fast-hard.wav', 0.6),
  (2.0, K+'phone/phone-vibrate-hand.wav', 1.0),
  (3.4, K+'pops/pop-large-bubble.wav', 0.8),
  (4.5, K+'shimmers/shimmer-long-bright.wav', 0.6),
  (6.0, K+'pops/pop-large-in.wav', 0.8),
  (10.5, K+'notifications/notification-message-in-clear.wav', 0.9),
  (11.7, K+'pops/pop-large-out.wav', 0.8),
]
def load(f):
    raw = subprocess.run(['ffmpeg','-v','error','-i',f,'-f','f32le','-ac','2','-ar',str(SR),'-'],capture_output=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()
mix = np.zeros((int(SR*D), 2), np.float32)
bgm = load(BGM)[:len(mix)]; env = np.ones(len(bgm))*0.55; f = int(SR*1.2); env[-f:] *= np.linspace(1, 0, f)
mix[:len(bgm)] += bgm*env[:, None]
for t, fn, g in EVENTS:
    a = load(fn)*g; i = int(t*SR); n = min(len(a), len(mix)-i); mix[i:i+n] += a[:n]
mix /= max(1e-6, np.abs(mix).max())/0.9
mix.tofile('_mix.f32')
subprocess.run(['ffmpeg','-v','error','-y','-f','f32le','-ar',str(SR),'-ac','2','-i','_mix.f32','-af','loudnorm=I=-15:TP=-1.5','-ar',str(SR),OUT], check=True)
