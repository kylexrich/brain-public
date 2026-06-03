#!/usr/bin/env bash
# BRB screen — EMLY-themed fullscreen terminal art with live clock
# Usage: ./brb-v4.sh (press q or Esc to exit)
# Requires a truecolor terminal (iTerm2, Kitty, Ghostty, Alacritty, etc.)

ESC=$'\033'
RST="${ESC}[0m"
BLD="${ESC}[1m"
SYNC_START="${ESC}[?2026h"
SYNC_END="${ESC}[?2026l"

# ── EMLY palette ──────────────────────────────────────────────────
BG="${ESC}[48;2;14;18;42m"
SUB_FG="${ESC}[38;2;214;126;170m"
CLK_FG="${ESC}[38;2;155;80;208m"
TMR_FG="${ESC}[38;2;134;79;106m"
RTN_FG="${ESC}[38;2;97;50;130m"

# Gradient stops: Soft Indigo → Lavender → Rose Pink
HL_R=88  HL_G=75  HL_B=196
HM_R=155 HM_G=80  HM_B=208
HR_R=220 HR_G=62  HR_B=148

FRAME_DELAY=0.08
SAFE_TOP=2
SAFE_BOTTOM=1
VERTICAL_BIAS=1
COLOR_STEP_FRAMES=4
PARTICLE_SPEED_SCALE=4

BIG_ART=(
"  ██████╗ ███████╗    ██████╗ ██╗ ██████╗ ██╗  ██╗████████╗    ██████╗  █████╗  ██████╗██╗  ██╗"
"  ██╔══██╗██╔════╝    ██╔══██╗██║██╔════╝ ██║  ██║╚══██╔══╝    ██╔══██╗██╔══██╗██╔════╝██║ ██╔╝"
"  ██████╔╝█████╗      ██████╔╝██║██║  ███╗███████║   ██║       ██████╔╝███████║██║     █████╔╝ "
"  ██╔══██╗██╔══╝      ██╔══██╗██║██║   ██║██╔══██║   ██║       ██╔══██╗██╔══██║██║     ██╔═██╗ "
"  ██████╔╝███████╗    ██║  ██║██║╚██████╔╝██║  ██║   ██║       ██████╔╝██║  ██║╚██████╗██║  ██╗"
"  ╚═════╝ ╚══════╝    ╚═╝  ╚═╝╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝       ╚═════╝ ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝"
)

SMALL_ART=(
"  ██████╗ ███████╗    ██████╗ ██╗ ██████╗ ██╗  ██╗████████╗    ██████╗  █████╗  ██████╗██╗  ██╗"
"  ██╔══██╗██╔════╝    ██╔══██╗██║██╔════╝ ██║  ██║╚══██╔══╝    ██╔══██╗██╔══██╗██╔════╝██║ ██╔╝"
"  ██████╔╝█████╗      ██████╔╝██║██║  ███╗███████║   ██║       ██████╔╝███████║██║     █████╔╝ "
"  ██╔══██╗██╔══╝      ██╔══██╗██║██║   ██║██╔══██║   ██║       ██╔══██╗██╔══██║██║     ██╔═██╗ "
"  ██████╔╝███████╗    ██║  ██║██║╚██████╔╝██║  ██║   ██║       ██████╔╝██║  ██║╚██████╗██║  ██╗"
"  ╚═════╝ ╚══════╝    ╚═╝  ╚═╝╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝       ╚═════╝ ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝"
)

BRB_ART=()
ART_WIDTH=0
ART_HEIGHT=0
CONTENT_HEIGHT=0
ACTIVE_ART=""

GRAD_LEN=0
declare -a GRAD

NUM_PARTICLES=16
declare -a PX PY PPX PPY PCHAR PCOLOR PSPEED
PARTICLE_CHARS=("·" "·" "∘" "⋆" "✦" "✧")
PARTICLE_COLORS=(
    "${ESC}[38;2;58;54;128m"
    "${ESC}[38;2;84;59;146m"
    "${ESC}[38;2;118;63;152m"
    "${ESC}[38;2;136;88;170m"
    "${ESC}[38;2;172;104;184m"
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

measure_art() {
    local line
    ART_HEIGHT=${#BRB_ART[@]}
    ART_WIDTH=0
    for line in "${BRB_ART[@]}"; do
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

    if (( cols >= 110 && rows >= 16 )); then
        desired="big"
    fi

    if [[ "$desired" == "$ACTIVE_ART" ]]; then
        return
    fi

    if [[ "$desired" == "big" ]]; then
        BRB_ART=("${BIG_ART[@]}")
    else
        BRB_ART=("${SMALL_ART[@]}")
    fi

    ACTIVE_ART=$desired
    measure_art
    precompute_gradient
}

layout_content() {
    local cols=$1 rows=$2 max_top v_pad

    select_art "$cols" "$rows"

    v_pad=$(( (rows - CONTENT_HEIGHT) / 2 + 1 + VERTICAL_BIAS ))
    (( v_pad < SAFE_TOP )) && v_pad=$SAFE_TOP

    max_top=$(( rows - SAFE_BOTTOM - CONTENT_HEIGHT + 1 ))
    (( max_top < SAFE_TOP )) && max_top=$SAFE_TOP
    (( v_pad > max_top )) && v_pad=$max_top

    ART_LEFT=$(( (cols - ART_WIDTH) / 2 + 1 ))
    (( ART_LEFT < 1 )) && ART_LEFT=1

    CONTENT_TOP=$v_pad
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
        printf 'away %ss' "$elapsed"
    elif (( elapsed < 3600 )); then
        printf 'away %sm %ss' "$(( elapsed / 60 ))" "$(( elapsed % 60 ))"
    else
        printf 'away %sh %sm' "$(( elapsed / 3600 ))" "$(( (elapsed % 3600) / 60 ))"
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
    local sub_text="── ✦ ──  ${LEAVE_REASON:-streaming will resume shortly}  ── ✦ ──"
    local sub_col now clk_col timer_text timer_col return_text return_col
    local content_top=$(( CONTENT_TOP - 1 ))
    local content_bottom=$(( CONTENT_BOTTOM + 1 ))

    printf -v spaces '%*s' "$cols" ''
    offset=$(( (FRAME / COLOR_STEP_FRAMES) % GRAD_LEN ))

    for (( idx=0; idx<ART_HEIGHT; idx++ )); do
        row=$(( CONTENT_TOP + idx ))
        line="${BRB_ART[$idx]}"
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
}

trap cleanup EXIT
trap 'cleanup; exit 0' INT TERM

read -r -p 'Back in how long? ' RETURN_TIME
read -r -p 'Reason for leaving? ' LEAVE_REASON

tput smcup
printf '%s' "${ESC}[?25l"
stty -echo 2>/dev/null

COLS=$(tput cols)
ROWS=$(tput lines)
layout_content "$COLS" "$ROWS"
init_particles "$COLS" "$ROWS"
fill_bg "$COLS" "$ROWS"
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
    fi

    render_frame "$COLS" "$ROWS"
done
