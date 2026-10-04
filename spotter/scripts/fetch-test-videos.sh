#!/usr/bin/env bash
# Downloads the openly licensed exercise videos the validation and end-to-end
# tests use, and cuts them into clips and fake-camera files. Everything lands
# in e2e/.cache/, which is not committed. Needs curl and ffmpeg.
# Credits and licences: e2e/VIDEO_CREDITS.md.
set -euo pipefail
cd "$(dirname "$0")/.."
C=e2e/.cache
mkdir -p "$C/videos" "$C/clips" "$C/fake"
# Wikimedia asks for a descriptive User-Agent with a way to reach the project.
UA="SpotterTests/0.1 (https://github.com/Nidhish-Senthilkumar/Pushup_Ai) curl/8"
B=https://upload.wikimedia.org/wikipedia/commons

fetch() { [ -s "$C/videos/$1" ] && [ "$(wc -c < "$C/videos/$1")" -gt 100000 ] || { curl -sSL -A "$UA" -o "$C/videos/$1" "$B/$2"; sleep 3; }; }
fetch interval-pushups.webm "9/98/Interval_Push-ups.webm"
fetch home-pushups.webm "1/18/Muscle_Strengthening_at_Home_-_Push-ups.webm"
fetch army-hrp.webm "0/0c/Army_Combat_Fitness_Test-_Hand-Release_Push-Up_%28HRP%29_%28Event_3%29.webm"
fetch home-half-squat.webm "a/ae/Muscle_Strengthening_at_Home_-_Half_squat.webm"
fetch squat-demo.webm "5/5c/Squat_-_exercise_demonstration_video.webm"
fetch jumping-jack-cgi.ogg "a/a7/Jumping_jack_movimiento.ogg"
fetch army-lunge.webm "5/57/Strength_Training_Circuit-_Forward_Lunge.webm"
fetch home-curls.webm "4/44/Muscle_Strengthening_at_Home_-_Bicep_Curls.webm"
fetch home-press.webm "b/b9/Muscle_Strengthening_at_Home_-_Overhead_Press.webm"
fetch situp-demo.webm "c/c7/Demonstration_of_A_Sit-up.webm"
fetch situps-tokyo.webm "4/4c/Situps-tokyoarea-2018.webm"
fetch navy-plank.webm "c/c4/Naval_Station_Rota_Navy_250_Plank_Challenge_%28986473%29.webm"

cut() { # name source start seconds
  [ -s "$C/clips/$1" ] || ffmpeg -v error -y -ss "$3" -t "$4" -i "$C/videos/$2" -an -vf "fps=30,scale='min(1280,iw)':-2" \
    -c:v libvpx-vp9 -b:v 2M -deadline realtime -cpu-used 8 "$C/clips/$1"
}
cut pushup-side.webm interval-pushups.webm 0 51.5
cut pushup-angled.webm home-pushups.webm 40 31
cut pushup-army-a.webm army-hrp.webm 0 6.5
cut pushup-army-b.webm army-hrp.webm 23 9
cut pushup-army-c.webm army-hrp.webm 75 6
cut squat-front-a.webm home-half-squat.webm 17 19
cut squat-front-b.webm home-half-squat.webm 40 9
cut squat-rear.webm squat-demo.webm 0 7.1
cut jj-cgi.webm jumping-jack-cgi.ogg 0 8
cut lunge-side-a.webm army-lunge.webm 31 7.5
cut lunge-side-b.webm army-lunge.webm 43 7
cut curl-two-people.webm home-curls.webm 46 18
cut press-seated.webm home-press.webm 20 19
cut situp-side.webm situp-demo.webm 4 12
cut situp-far.webm situps-tokyo.webm 0 9.8
cut plank-navy.webm navy-plank.webm 0 43

# Fake-camera files: Chrome plays these as if they were a webcam.
[ -s "$C/fake/squat-front.y4m" ] || ffmpeg -v error -y -i "$C/clips/squat-front-a.webm" -vf "scale=640:-2,fps=25" -pix_fmt yuv420p "$C/fake/squat-front.y4m"
[ -s "$C/fake/pushup-side.y4m" ] || ffmpeg -v error -y -ss 3 -t 30 -i "$C/clips/pushup-side.webm" -vf "scale=640:-2,fps=25" -pix_fmt yuv420p "$C/fake/pushup-side.y4m"
[ -s "$C/fake/jj-front.y4m" ] || ffmpeg -v error -y -stream_loop 3 -i "$C/clips/jj-cgi.webm" -t 30 -vf "scale=640:-2,fps=25" -pix_fmt yuv420p "$C/fake/jj-front.y4m"


# Held-out clips (see scripts/validation/truth.json): counted by hand before the engine saw them.
fetch press-demo.webm "6/69/Shoulder_press_-_exercise_demonstration_video.webm"
fetch army-push-press.webm "b/ba/Strength_Training_Circuit-_Overhead_Push_Press.webm"
cut press-demo-rear.webm press-demo.webm 0 6.9
cut pushpress-front.webm army-push-press.webm 41.5 5
# Two players side by side for the Arcade duel: the same squat clip twice, the right one 4 s later.
[ -s "$C/fake/duel.y4m" ] || ffmpeg -v error -y -i "$C/clips/squat-front-a.webm" -ss 4 -i "$C/clips/squat-front-a.webm" \
  -filter_complex "[0:v]crop=iw*0.6:ih:iw*0.2:0,scale=480:-2[a];[1:v]crop=iw*0.6:ih:iw*0.2:0,scale=480:-2[b];[a][b]hstack=2,fps=25,format=yuv420p[v]" \
  -map "[v]" -t 14 "$C/fake/duel.y4m"

# Stress versions of three clips (same true counts): a dark room, a slow 12 fps camera, and the person small in the frame.
stress() { # name
  [ -s "$C/clips/$1-dark.webm" ] || ffmpeg -v error -y -i "$C/clips/$1.webm" -vf "eq=brightness=-0.25:contrast=0.7,noise=alls=12:allf=t" -c:v libvpx-vp9 -b:v 2M -deadline realtime -cpu-used 8 "$C/clips/$1-dark.webm"
  [ -s "$C/clips/$1-12fps.webm" ] || ffmpeg -v error -y -i "$C/clips/$1.webm" -vf "fps=12" -c:v libvpx-vp9 -b:v 2M -deadline realtime -cpu-used 8 "$C/clips/$1-12fps.webm"
  [ -s "$C/clips/$1-far.webm" ] || ffmpeg -v error -y -i "$C/clips/$1.webm" -vf "scale=iw*0.4:-2,pad=iw/0.4:ih/0.4:(ow-iw)/2:(oh-ih)/2:color=0x6b6b6b" -c:v libvpx-vp9 -b:v 2M -deadline realtime -cpu-used 8 "$C/clips/$1-far.webm"
}
stress squat-front-a
stress pushup-side
stress press-seated

# Burpees, side view (counted by hand before the burpee detector was written).
fetch jj-burpees.webm "5/57/Jumping_jacks_and_burpees.webm"
cut burpee-side.webm jj-burpees.webm 24 21.3
echo "Test footage ready in $C"
