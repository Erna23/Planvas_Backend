// fixedSchedule.service.js
import { findUserById } from "../repositories/user.repository.js";
import {
  createFixedActivitiesMany,
  findFixedActivitiesByUserId,
  updateUserActivityById,
  deleteUserActivityById,
} from "../repositories/schedule.repository.js";

const dayMap = {
    'SUN': 0, 'MON': 1, 'TUE': 2, 'WED': 3,
    'THU': 4, 'FRI': 5, 'SAT': 6
}

export async function addFixedSchedule(userId, body) {
    const user = await findUserById(userId);
    if (!user) throwError();

    const targetDays = body.daysOfWeek.map(day => dayMap[day]);

    const endDay = new Date(body.endDate);
    const schedules = [];
    for(let date = new Date(body.startDate); date <= endDay; date.setDate(date.getDate() + 1)) {
        const dayOfWeek = date.getDay();

        if(targetDays.includes(dayOfWeek)) {
            const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      
            schedules.push({
                title: body.title,
                startAt: new Date(`${dateStr}T${body.startTime}:00`),
                endAt: new Date(`${dateStr}T${body.endTime}:00`)
            });
        }
    }

    const ids = await createFixedActivitiesMany(userId, schedules);
    return {
        fixedScheduleId: ids,
        title: body.title,
        startDate: body.startDate,
        endDate: body.endDate,
        daysOfWeek: body.daysOfWeek,
        startTime: body.startTime,
        endTime: body.endTime
    }
}

export async function getFixedSchedule(userId) {
  const user = await findUserById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    err.payload = {
      resultType: "FAIL",
      error: { reason: "사용자 정보를 찾을 수 없습니다.", data: null },
      success: null,
    };
    throw err;
  }

  return findFixedActivitiesByUserId(userId);
}

export async function updateFixedSchedule(userId, id, body) {
    const user = await findUserById(userId);
    if (!user) {
        const err = new Error("User not found");
        err.statusCode = 404;
        err.payload = {
            resultType: "FAIL",
            error: { reason: "사용자 정보를 찾을 수 없습니다.", data: null },
            success: null,
        };
        throw err;
    }

    return await updateUserActivityById(id, body);
}

export async function deleteFixedSchedule(userId, id) {
    const user = await findUserById(userId);
    if (!user) {
        const err = new Error("User not found");
        err.statusCode = 404;
        err.payload = {
            resultType: "FAIL",
            error: { reason: "사용자 정보를 찾을 수 없습니다.", data: null },
            success: null,
        };
        throw err;
    }
    
    const deleted = await deleteUserActivityById(id);
    return {
        deleted: deleted,
        message: "고정 일정이 삭제되었습니다."
    };
}


export async function getTodos {
    
}

export async function completeTodos {

}

export async function createMyActivity {

}

export async function getMyActivityInfo {

}

export async function updateMyActivity {

}

export async function deleteMyActivity {

}

export async function completeMyActivity {

}

function parseDateOnly(dateStr) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
    if (!m) throwError(400, "날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)");
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    return new Date(Date.UTC(y, mo - 1, d));
  }
  
  function parseTimeOnly(timeStr) {
    const m = /^(\d{2}):(\d{2})$/.exec(timeStr);
    if (!m) throwError(400, "시간 형식이 올바르지 않습니다. (HH:mm)");
    const hh = Number(m[1]);
    const mm = Number(m[2]);
    if (hh < 0 || hh > 23) throwError(400, "시간(hour)은 00~23 사이여야 합니다.");
    if (mm < 0 || mm > 59) throwError(400, "분(minute)은 00~59 사이여야 합니다.");
    return { hh, mm };
  }
  
  function combineKST(dateUTC, { hh, mm }) {
    // KST(+09:00)로 날짜+시간 합치기
    const y = dateUTC.getUTCFullYear();
    const mo = String(dateUTC.getUTCMonth() + 1).padStart(2, "0");
    const d = String(dateUTC.getUTCDate()).padStart(2, "0");
    const H = String(hh).padStart(2, "0");
    const M = String(mm).padStart(2, "0");
    return new Date(`${y}-${mo}-${d}T${H}:${M}:00+09:00`);
  }
  
  function eachDateUTCInclusive(startUTC, endUTC) {
    const dates = [];
    const cur = new Date(startUTC.getTime());
    while (cur.getTime() <= endUTC.getTime()) {
      dates.push(new Date(cur.getTime()));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return dates;
  }