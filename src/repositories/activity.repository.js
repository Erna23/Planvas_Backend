import { prisma } from "../db.config.js"

export async function createNewActivity(data) {
    const isGrowth = data.category === "GROWTH";
    
    return await prisma.activity.create({
        data: {
            name: data.title,
            category: data.category,
            growth_point: isGrowth ? data.point : 0,
            rest_point: isGrowth ? 0 : data.point
        },
        select: {
            id: true,
            name: true
        }
    });
}

export async function getMyActivityInfo(id) {
    return await prisma.activity.findFirst({
        where: id,
        select: {
            id: true,
            title: true,
            category: true,
            growth_point: true,
            rest_point: true
        }
    })
}