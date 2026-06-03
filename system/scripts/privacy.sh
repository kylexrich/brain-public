#!/usr/bin/env bash
# Privacy Mode screen — fullscreen terminal art with live clock
# Usage: ./privacy.sh (press q or Esc to exit)
# Requires a truecolor terminal (iTerm2, Kitty, Ghostty, Alacritty, etc.)

ESC=$'\033'
RST="${ESC}[0m"
BLD="${ESC}[1m"
SYNC_START="${ESC}[?2026h"
SYNC_END="${ESC}[?2026l"

# ── Privacy palette — deep navy-black, cold ice-blue center glow ──
BG_HEX="#080A12"
BG="${ESC}[48;2;8;10;18m"
SUB_FG="${ESC}[38;2;100;130;175m"
CLK_FG="${ESC}[38;2;140;175;225m"
TMR_FG="${ESC}[38;2;64;85;119m"
RTN_FG="${ESC}[38;2;88;114;151m"

# Gradient: steel blue → ice white-blue → steel blue (center glow)
HL_R=45  HL_G=100 HL_B=185
HM_R=195 HM_G=215 HM_B=255
HR_R=45  HR_G=100 HR_B=185

FRAME_DELAY=0.08
SAFE_TOP=2
SAFE_BOTTOM=1
VERTICAL_BIAS=1
COLOR_STEP_FRAMES=6
PARTICLE_SPEED_SCALE=5

BIG_ART=(
"  ██████╗ ██████╗ ██╗██╗   ██╗  █████╗  ██████╗██╗   ██╗  ███╗   ███╗ ██████╗ ██████╗ ███████╗"
"  ██╔══██╗██╔══██╗██║██║   ██║ ██╔══██╗██╔════╝╚██╗ ██╔╝  ████╗ ████║██╔═══██╗██╔══██╗██╔════╝"
"  ██████╔╝██████╔╝██║██║   ██║ ███████║██║      ╚████╔╝   ██╔████╔██║██║   ██║██║  ██║█████╗  "
"  ██╔═══╝ ██╔══██╗██║╚██╗ ██╔╝ ██╔══██║██║       ╚██╔╝    ██║╚██╔╝██║██║   ██║██║  ██║██╔══╝  "
"  ██║     ██║  ██║██║ ╚████╔╝  ██║  ██║╚██████╗   ██║     ██║ ╚═╝ ██║╚██████╔╝██████╔╝███████╗"
"  ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═══╝   ╚═╝  ╚═╝ ╚═════╝   ╚═╝     ╚═╝     ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝"
)

SMALL_ART=(
"  ██████╗ ██████╗ ██╗██╗   ██╗  █████╗  ██████╗██╗   ██╗  ███╗   ███╗ ██████╗ ██████╗ ███████╗"
"  ██╔══██╗██╔══██╗██║██║   ██║ ██╔══██╗██╔════╝╚██╗ ██╔╝  ████╗ ████║██╔═══██╗██╔══██╗██╔════╝"
"  ██████╔╝██████╔╝██║██║   ██║ ███████║██║      ╚████╔╝   ██╔████╔██║██║   ██║██║  ██║█████╗  "
"  ██╔═══╝ ██╔══██╗██║╚██╗ ██╔╝ ██╔══██║██║       ╚██╔╝    ██║╚██╔╝██║██║   ██║██║  ██║██╔══╝  "
"  ██║     ██║  ██║██║ ╚████╔╝  ██║  ██║╚██████╗   ██║     ██║ ╚═╝ ██║╚██████╔╝██████╔╝███████╗"
"  ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═══╝   ╚═╝  ╚═╝ ╚═════╝   ╚═╝     ╚═╝     ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝"
)

PRIVACY_ART=()
ART_WIDTH=0
ART_HEIGHT=0
CONTENT_HEIGHT=0
ACTIVE_ART=""

GRAD_LEN=0
declare -a GRAD

NUM_PARTICLES=16
declare -a PX PY PPX PPY PCHAR PCOLOR PSPEED
PARTICLE_CHARS=("·" "·" "∘" "○" "◎" "⊙")
PARTICLE_COLORS=(
    "${ESC}[38;2;20;30;55m"
    "${ESC}[38;2;30;45;80m"
    "${ESC}[38;2;40;60;100m"
    "${ESC}[38;2;55;80;130m"
    "${ESC}[38;2;70;100;155m"
)

FRAME=0
START_SECONDS=$SECONDS
CLEANED_UP=0

RETURN_TIME=""
LEAVE_REASON=""

COLS=0
ROWS=0
CONTENT_TOP=0
CONTENT_BOTTOM=0
ART_LEFT=0
SUBTITLE_ROW=0
CLOCK_ROW=0
TIMER_ROW=0
RETURN_ROW=0

IMAGE_B64=""
IMAGE_TOP=0
IMAGE_ROWS=7
IMAGE_APPROX_COLS=14
FLAT_IMG_PATH=""

measure_art() {
    local line
    ART_HEIGHT=${#PRIVACY_ART[@]}
    ART_WIDTH=0
    for line in "${PRIVACY_ART[@]}"; do
        (( ${#line} > ART_WIDTH )) && ART_WIDTH=${#line}
    done
    CONTENT_HEIGHT=$(( ART_HEIGHT + 7 ))
}

precompute_gradient() {
    local max x t t2 r g b
    GRAD=()
    GRAD_LEN=$(( ART_WIDTH * 2 ))
    max=$(( ART_WIDTH - 1 ))
    (( max < 1 )) && max=1

    for (( x=0; x<ART_WIDTH; x++ )); do
        t=$(( x * 1000 / max ))
        if (( t <= 500 )); then
            t2=$(( t * 2 ))
            r=$(( HL_R + (HM_R - HL_R) * t2 / 1000 ))
            g=$(( HL_G + (HM_G - HL_G) * t2 / 1000 ))
            b=$(( HL_B + (HM_B - HL_B) * t2 / 1000 ))
        else
            t2=$(( (t - 500) * 2 ))
            r=$(( HM_R + (HR_R - HM_R) * t2 / 1000 ))
            g=$(( HM_G + (HR_G - HM_G) * t2 / 1000 ))
            b=$(( HM_B + (HR_B - HM_B) * t2 / 1000 ))
        fi
        GRAD[$x]="${ESC}[38;2;${r};${g};${b}m"
        GRAD[$(( GRAD_LEN - 1 - x ))]="${ESC}[38;2;${r};${g};${b}m"
    done
}

select_art() {
    local cols=$1 rows=$2 desired="small"

    if (( cols >= 110 && rows >= 14 )); then
        desired="big"
    fi

    if [[ "$desired" == "$ACTIVE_ART" ]]; then
        return
    fi

    if [[ "$desired" == "big" ]]; then
        PRIVACY_ART=("${BIG_ART[@]}")
    else
        PRIVACY_ART=("${SMALL_ART[@]}")
    fi

    ACTIVE_ART=$desired
    measure_art
    precompute_gradient
}

layout_content() {
    local cols=$1 rows=$2 max_top v_pad img_offset total_height

    select_art "$cols" "$rows"

    img_offset=0
    [[ -n "$IMAGE_B64" ]] && img_offset=$(( IMAGE_ROWS + 2 ))
    total_height=$(( CONTENT_HEIGHT + img_offset ))

    v_pad=$(( (rows - total_height) / 2 + 1 + VERTICAL_BIAS ))
    (( v_pad < SAFE_TOP )) && v_pad=$SAFE_TOP

    max_top=$(( rows - SAFE_BOTTOM - total_height + 1 ))
    (( max_top < SAFE_TOP )) && max_top=$SAFE_TOP
    (( v_pad > max_top )) && v_pad=$max_top

    IMAGE_TOP=$v_pad
    CONTENT_TOP=$(( v_pad + img_offset ))

    ART_LEFT=$(( (cols - ART_WIDTH) / 2 + 1 ))
    (( ART_LEFT < 1 )) && ART_LEFT=1

    SUBTITLE_ROW=$(( CONTENT_TOP + ART_HEIGHT + 2 ))
    CLOCK_ROW=$(( CONTENT_TOP + ART_HEIGHT + 4 ))
    TIMER_ROW=$(( CONTENT_TOP + ART_HEIGHT + 5 ))
    RETURN_ROW=$(( CONTENT_TOP + ART_HEIGHT + 7 ))
    CONTENT_BOTTOM=$RETURN_ROW
}

random_particle_position() {
    local cols=$1 rows=$2 x y

    while true; do
        x=$(( RANDOM % cols + 1 ))
        y=$(( RANDOM % rows + 1 ))
        if (( y < CONTENT_TOP - 1 || y > CONTENT_BOTTOM + 1 )); then
            printf '%s %s\n' "$x" "$y"
            return
        fi
    done
}

init_particles() {
    local cols=$1 rows=$2 i coords

    for (( i=0; i<NUM_PARTICLES; i++ )); do
        coords=$(random_particle_position "$cols" "$rows")
        PX[$i]=${coords% *}
        PY[$i]=${coords#* }
        PPX[$i]=${PX[$i]}
        PPY[$i]=${PY[$i]}
        PCHAR[$i]="${PARTICLE_CHARS[$(( RANDOM % ${#PARTICLE_CHARS[@]} ))]}"
        PCOLOR[$i]="${PARTICLE_COLORS[$(( RANDOM % ${#PARTICLE_COLORS[@]} ))]}"
        PSPEED[$i]=$(( ((RANDOM % 5) + 2) * PARTICLE_SPEED_SCALE ))
    done
}

fill_bg() {
    local cols=$1 rows=$2 buf="" spaces row
    printf -v spaces '%*s' "$cols" ''
    for (( row=1; row<=rows; row++ )); do
        buf+="${ESC}[${row};1H${BG}${spaces}"
    done
    printf '%s' "${SYNC_START}${buf}${RST}${SYNC_END}"
}

init_image() {
    local script_dir img_path cmd="" target_w target_h
    script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    img_path="${script_dir}/privacy-exact.png"
    [[ -f "$img_path" ]] || return

    command -v magick  &>/dev/null && cmd="magick"
    command -v convert &>/dev/null && cmd="${cmd:-convert}"
    if [[ -n "$cmd" ]]; then
        FLAT_IMG_PATH="/tmp/privacy_flat_$$.png"
        # Pre-size image to exactly match our cell box (approx 8px wide × 16px tall per cell).
        # Resize preserving aspect ratio, then pad any remainder with bg color.
        # This guarantees the image fills exactly IMAGE_APPROX_COLS×IMAGE_ROWS cells with no gaps.
        target_w=$(( IMAGE_APPROX_COLS * 8 ))
        target_h=$(( IMAGE_ROWS * 16 ))
        "$cmd" "$img_path" -background "$BG_HEX" -flatten \
            -resize "${target_w}x${target_h}" \
            -gravity center -background "$BG_HEX" -extent "${target_w}x${target_h}" \
            "$FLAT_IMG_PATH" 2>/dev/null \
            && img_path="$FLAT_IMG_PATH" \
            || FLAT_IMG_PATH=""
    fi

    IMAGE_B64=$(base64 < "$img_path")
}

draw_image() {
    local cols=$1
    [[ -z "$IMAGE_B64" ]] && return
    local img_col=$(( (cols - IMAGE_APPROX_COLS) / 2 + 1 ))
    (( img_col < 1 )) && img_col=1
    printf '%s' "${ESC}[${IMAGE_TOP};${img_col}H"
    printf '\033]1337;File=inline=1;width=%d;height=%d;preserveAspectRatio=0:%s\a' \
        "$IMAGE_APPROX_COLS" "$IMAGE_ROWS" "$IMAGE_B64"
    printf '%s' "${ESC}[1;1H"
}

draw_gradient_line() {
    local line=$1 offset=$2 buf="" idx
    for (( idx=0; idx<${#line}; idx++ )); do
        buf+="${GRAD[$(( (idx + offset) % GRAD_LEN ))]}${line:idx:1}"
    done
    printf '%s' "$buf"
}

draw_timer_text() {
    local elapsed=$(( SECONDS - START_SECONDS ))

    if (( elapsed < 60 )); then
        printf 'private for %ss' "$elapsed"
    elif (( elapsed < 3600 )); then
        printf 'private for %sm %ss' "$(( elapsed / 60 ))" "$(( elapsed % 60 ))"
    else
        printf 'private for %sh %sm' "$(( elapsed / 3600 ))" "$(( (elapsed % 3600) / 60 ))"
    fi
}

update_particles() {
    local cols=$1 rows=$2 i

    for (( i=0; i<NUM_PARTICLES; i++ )); do
        PPX[$i]=${PX[$i]}
        PPY[$i]=${PY[$i]}

        if (( FRAME % PSPEED[$i] != 0 )); then
            continue
        fi

        PY[$i]=$(( PY[$i] - 1 ))

        if (( RANDOM % 4 == 0 )); then
            PX[$i]=$(( PX[$i] + (RANDOM % 3) - 1 ))
            (( PX[$i] < 1 )) && PX[$i]=1
            (( PX[$i] > cols )) && PX[$i]=$cols
        fi

        if (( PY[$i] < 1 )); then
            PY[$i]=$rows
            PX[$i]=$(( RANDOM % cols + 1 ))
            PCHAR[$i]="${PARTICLE_CHARS[$(( RANDOM % ${#PARTICLE_CHARS[@]} ))]}"
            PCOLOR[$i]="${PARTICLE_COLORS[$(( RANDOM % ${#PARTICLE_COLORS[@]} ))]}"
            PSPEED[$i]=$(( ((RANDOM % 5) + 2) * PARTICLE_SPEED_SCALE ))
        fi
    done
}

render_frame() {
    local cols=$1 rows=$2
    local buf="" spaces offset row idx
    local line line_buf
    local sub_text="──  ◉  ──  ${LEAVE_REASON:-streaming will resume shortly}  ──  ◉  ──"
    local sub_col now clk_col timer_text timer_col return_text return_col
    local content_top=$(( CONTENT_TOP - 1 ))
    [[ -n "$IMAGE_B64" && IMAGE_TOP -gt 0 ]] && content_top=$(( IMAGE_TOP - 1 ))
    local content_bottom=$(( CONTENT_BOTTOM + 1 ))

    printf -v spaces '%*s' "$cols" ''
    offset=$(( (FRAME / COLOR_STEP_FRAMES) % GRAD_LEN ))

    for (( idx=0; idx<ART_HEIGHT; idx++ )); do
        row=$(( CONTENT_TOP + idx ))
        line="${PRIVACY_ART[$idx]}"
        line_buf=$(draw_gradient_line "$line" "$offset")
        buf+="${ESC}[${row};${ART_LEFT}H${BG}${BLD}${line_buf}${RST}"
    done

    sub_col=$(( (cols - ${#sub_text}) / 2 + 1 ))
    (( sub_col < 1 )) && sub_col=1
    buf+="${ESC}[${SUBTITLE_ROW};${sub_col}H${BG}${SUB_FG}${sub_text}${RST}"

    now=$(date +"%l:%M %p")
    now="${now## }"
    clk_col=$(( (cols - ${#now}) / 2 + 1 ))
    (( clk_col < 1 )) && clk_col=1
    buf+="${ESC}[${CLOCK_ROW};1H${BG}${spaces}${RST}"
    buf+="${ESC}[${CLOCK_ROW};${clk_col}H${BG}${CLK_FG}${BLD}${now}${RST}"

    timer_text=$(draw_timer_text)
    timer_col=$(( (cols - ${#timer_text}) / 2 + 1 ))
    (( timer_col < 1 )) && timer_col=1
    buf+="${ESC}[${TIMER_ROW};1H${BG}${spaces}${RST}"
    buf+="${ESC}[${TIMER_ROW};${timer_col}H${BG}${TMR_FG}${timer_text}${RST}"

    if [[ -n "$RETURN_TIME" ]]; then
        return_text="back in ~${RETURN_TIME}"
        return_col=$(( (cols - ${#return_text}) / 2 + 1 ))
        (( return_col < 1 )) && return_col=1
        buf+="${ESC}[${RETURN_ROW};1H${BG}${spaces}${RST}"
        buf+="${ESC}[${RETURN_ROW};${return_col}H${BG}${RTN_FG}${return_text}${RST}"
    fi

    for (( idx=0; idx<NUM_PARTICLES; idx++ )); do
        if (( PPY[$idx] >= content_top && PPY[$idx] <= content_bottom )); then
            continue
        fi
        if (( PPY[$idx] >= 1 && PPY[$idx] <= rows && PPX[$idx] >= 1 && PPX[$idx] <= cols )); then
            buf+="${ESC}[${PPY[$idx]};${PPX[$idx]}H${BG} "
        fi
    done

    update_particles "$cols" "$rows"

    for (( idx=0; idx<NUM_PARTICLES; idx++ )); do
        if (( PY[$idx] >= content_top && PY[$idx] <= content_bottom )); then
            continue
        fi
        if (( PY[$idx] >= 1 && PY[$idx] <= rows && PX[$idx] >= 1 && PX[$idx] <= cols )); then
            buf+="${ESC}[${PY[$idx]};${PX[$idx]}H${BG}${PCOLOR[$idx]}${PCHAR[$idx]}"
        fi
    done

    printf '%s' "${SYNC_START}${buf}${RST}${SYNC_END}"
}

cleanup() {
    (( CLEANED_UP )) && return
    CLEANED_UP=1
    trap - EXIT INT TERM
    printf '%s' "${ESC}[?25h${RST}"
    tput rmcup
    stty echo 2>/dev/null
    [[ -n "$FLAT_IMG_PATH" ]] && rm -f "$FLAT_IMG_PATH"
}

trap cleanup EXIT
trap 'cleanup; exit 0' INT TERM

init_image

read -r -p 'Back in how long? ' RETURN_TIME
read -r -p 'Reason for privacy mode? ' LEAVE_REASON

tput smcup
printf '%s' "${ESC}[?25l"
stty -echo 2>/dev/null

COLS=$(tput cols)
ROWS=$(tput lines)
layout_content "$COLS" "$ROWS"
init_particles "$COLS" "$ROWS"
fill_bg "$COLS" "$ROWS"
draw_image "$COLS"
render_frame "$COLS" "$ROWS"

while true; do
    if read -rsn1 -t "$FRAME_DELAY" key 2>/dev/null; then
        case "$key" in
            q|Q|$'\e') break ;;
        esac
    fi

    FRAME=$(( FRAME + 1 ))

    new_cols=$(tput cols)
    new_rows=$(tput lines)
    if [[ "$new_cols" != "$COLS" || "$new_rows" != "$ROWS" ]]; then
        COLS=$new_cols
        ROWS=$new_rows
        layout_content "$COLS" "$ROWS"
        init_particles "$COLS" "$ROWS"
        fill_bg "$COLS" "$ROWS"
        draw_image "$COLS"
    fi

    render_frame "$COLS" "$ROWS"
done
