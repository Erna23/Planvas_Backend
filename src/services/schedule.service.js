// src/services/schedule.service.js
import { findUserById } from "../repositories/user.repository.js";
import {
  createFixedActivitiesMany,
  findFixedActivitiesByUserId,
  updateUserActivityById,
  deleteUserActivityById,
  addOwnUserActivity,
  completeActivity,
  getDateActivity,
  findUserActivityById,
} from "../repositories/schedule.repository.js";

// ✅ activity.repository.js에 있는 export만 사용 (findById)
import { findById as findCatalogActivityById } from "../repositories/activity.repository.js";

const dayMap = {
  SUN: 0,
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
};

export async function addFixedSchedule(userId, body) {
  const user = await findUserById(userId);
  if (!user) throwError();

  const targetDays = body.daysOfWeek.map((day) => dayMap[day]);

  const endDay = new Date(body.endDate);
  const schedules = [];
  for (let date = new Date(body.startDate); date <= endDay; date.setDate(date.getDate() + 1)) {
    const dayOfWeek = date.getDay();

    if (targetDays.includes(dayOfWeek)) {
      const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD

      schedules.push({
        title: body.title,
        startAt: new Date(`${dateStr}T${body.startTime}:00`),
        endAt: new Date(`${dateStr}T${body.endTime}:00`),
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
    endTime: body.endTime,
  };
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

  await updateUserActivityById(id, body);
  return { msg: "수정이 완료되었습니다." };
}

export async function getTodos(userId, date) {
  return await getDateActivity(userId, date);
}

export async function completeTodos(id) {
  return { id: (await completeActivity(id)).id };
}

// ✅ 여기만 “필수 수정”
export async function createMyActivity(userId, body) {
  let baseActivity;

  // 1) activityId 없으면: body 기반 “임시 activity”를 만들어서 넘김
  if (body.activityId == null) {
    baseActivity = {
      id: null,
      title: body.title,
      tab: body.category ?? body.tab, // (너 코드에서 category 쓰길래 둘 다 받게)
      point: body.point,
    };
  } else {
    // 2) activityId 있으면: 카탈로그(ActivityCatalog)에서 조회 (findById 사용)
    baseActivity = await findCatalogActivityById(Number(body.activityId));
    if (!baseActivity) {
      const err = new Error("Activity not found");
      err.statusCode = 404;
      err.payload = {
        resultType: "FAIL",
        error: { reason: "해당 활동을 찾을 수 없습니다.", data: null },
        success: null,
      };
      throw err;
    }
  }

  // addOwnUserActivity는 기존 로직 그대로 활용
  return await addOwnUserActivity(userId, baseActivity, body);
}

export async function getMyActivityInfo(userId, Id) {
  const ownActivity = await findUserActivityById(Id);

  return {
    myActivityId: ownActivity.id,
    title: ownActivity.title,
    category: ownActivity.category,
    point: ownActivity.point,
    startAt: ownActivity.startAt,
    endAt: ownActivity.endAt,
    completed: ownActivity.completed,
  };
}

export async function updateMyActivity(userId, id, body) {
  await updateUserActivityById(id, body);
  return { msg: "수정이 완료되었습니다." };
}

export async function deleteMyActivity(userId, id) {
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
    deleted,
    message: "고정 일정이 삭제되었습니다.",
  };
}
// ✅ controller가 찾는 이름 맞춰주는 별칭 함수
export async function deleteFixedSchedule(userId, id) {
  return deleteMyActivity(userId, id);
}


export async function completeMyActivity(userId, id) {
  const goal = await findCurrentGoalPeriodByUserId(userId);
  const { before_growth, before_rest } = await getGrowthAndRest(userId, goal.startDate, goal.endDate);

  const activity = await completeActivity(id);
  const { after_growth, after_rest } = await getGrowthAndRest(userId, goal.startDate, goal.endDate);

  return {
    myActivityId: activity.id,
    beforeProgress: {
      growthAchieved: before_growth,
      restAchieved: before_rest,
    },
    afterProgress: {
      growthAchieved: after_growth,
      restAchieved: after_rest,
    },
  };
}
