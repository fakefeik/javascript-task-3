'use strict';

/**
 * Сделано задание на звездочку
 * Реализовано оба метода и tryLater
 */
exports.isStar = true;

var TIME_REGEXP = /(\d{2}):(\d{2})\+(\d+)/;
var DAYS_OF_WEEK = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
var ROBBERY_DAYS = 3;
var NEXT_TRY = 30 * 60 * 1000;

function prettifyTime(time) {
    time = time.toString();
    if (time.length === 1) {
        time = '0' + time;
    }

    return time;
}

function parseTime(timeString) {
    var timeGroups = TIME_REGEXP.exec(timeString);

    return {
        hours: parseInt(timeGroups[1], 10),
        minutes: parseInt(timeGroups[2], 10),
        timeZone: parseInt(timeGroups[3], 10)
    };
}

function normalizeDate(day, hours, minutes) {
    var date = new Date(0);
    date.setUTCDate(day);
    date.setUTCHours(hours, minutes);

    return date;
}

function normalizeTime(timeString, timeZone) {
    var time = parseTime(timeString.substring(3));

    var hoursToAdd = timeZone - time.timeZone;
    var day = DAYS_OF_WEEK.indexOf(timeString.substring(0, 2)) + 1;
    var hours = time.hours + hoursToAdd;
    var minutes = time.minutes;

    if (hours > 23 || hours < 0) {
        var delta = Math.sign(hours);
        hours += -24 * delta;
        day += delta;
    }

    return normalizeDate(day, hours, minutes);
}

function invertSchedule(schedule, timeZone) {
    var result = [];

    // Неделя начинается немного зарание, чтобы избежать багов с timeZone
    var startWeek = normalizeDate(-1, 0, 0);
    var endWeek = normalizeDate(7, 0, 0);

    if (schedule.length === 0) {
        return [{
            from: startWeek,
            to: endWeek
        }];
    }

    for (var j = 0; j < schedule.length; j++) {
        var time = j === 0 ? {
            from: startWeek,
            to: normalizeTime(schedule[j].from, timeZone)
        } : {
            from: normalizeTime(schedule[j - 1].to, timeZone),
            to: normalizeTime(schedule[j].from, timeZone)
        };
        result.push(time);
    }
    result.push({
        from: normalizeTime(schedule[schedule.length - 1].to, timeZone),
        to: endWeek
    });

    return result;
}

function normalizeSchedule(schedule, workingHours) {
    var from = parseTime(workingHours.from);
    var to = parseTime(workingHours.to);
    var timeZone = from.timeZone;

    var bankSchedule = Array
        .apply(null, new Array(ROBBERY_DAYS))
        .map(function (_, dayIndex) {
            return {
                from: normalizeDate(dayIndex + 1, from.hours, from.minutes),
                to: normalizeDate(dayIndex + 1, to.hours, to.minutes)
            };
        });

    var normalizedSchedule = { bank: bankSchedule };
    Object.keys(schedule).forEach(function (key) {
        normalizedSchedule[key] = invertSchedule(schedule[key], timeZone);
    });

    return normalizedSchedule;
}

function isInTimeRanges(timeRanges, time, duration) {
    return timeRanges.some(function (timeRange) {
        return time >= timeRange.from &&
            new Date(time.getTime() + duration) <= timeRange.to;
    });
}

function timesMatch(schedule, start, duration) {
    return Object.keys(schedule).every(function (e) {
        return isInTimeRanges(schedule[e], start, duration);
    });
}

function getFirstAppropriateMoment(schedule, duration, start) {
    start = new Date(start || 0);
    var possibleStarts = Object.keys(schedule)
        .reduce(function (acc, val) {
            return acc.concat(schedule[val].map(function (deltaTime) {
                return deltaTime.from;
            }));
        }, [])
        .filter(function (time) {
            return time >= start;
        })
        .concat([start])
        .sort(function (a, b) {
            return a > b ? 1 : -1;
        });

    for (var i = 0; i < possibleStarts.length; i++) {
        if (timesMatch(schedule, possibleStarts[i], duration)) {
            return possibleStarts[i];
        }
    }

    return null;
}

/**
 * @param {Object} schedule – Расписание Банды
 * @param {Number} duration - Время на ограбление в минутах
 * @param {Object} workingHours – Время работы банка
 * @param {String} workingHours.from – Время открытия, например, "10:00+5"
 * @param {String} workingHours.to – Время закрытия, например, "18:00+5"
 * @returns {Object}
 */
exports.getAppropriateMoment = function (schedule, duration, workingHours) {
    var normalizedDuration = duration * 60 * 1000;
    var normalizedSchedule = normalizeSchedule(schedule, workingHours);
    var moment = getFirstAppropriateMoment(normalizedSchedule, normalizedDuration);

    return {

        /**
         * Найдено ли время
         * @returns {Boolean}
         */
        exists: function () {
            return Boolean(moment);
        },

        /**
         * Возвращает отформатированную строку с часами для ограбления
         * Например,
         *   "Начинаем в %HH:%MM (%DD)" -> "Начинаем в 14:59 (СР)"
         * @param {String} template
         * @returns {String}
         */
        format: function (template) {
            return !moment ? '' : template
                .replace('%DD', DAYS_OF_WEEK[moment.getUTCDate() - 1])
                .replace('%HH', prettifyTime(moment.getUTCHours()))
                .replace('%MM', prettifyTime(moment.getUTCMinutes()));
        },

        /**
         * Попробовать найти часы для ограбления позже [*]
         * @star
         * @returns {Boolean}
         */
        tryLater: function () {
            if (!moment) {
                return false;
            }

            var newMoment = getFirstAppropriateMoment(
                normalizedSchedule, normalizedDuration,
                moment.getTime() + NEXT_TRY);

            if (newMoment) {
                moment = newMoment;
            }

            return Boolean(newMoment);
        }
    };
};
