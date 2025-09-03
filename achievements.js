let achievements = {
    damage_1: {
        name: "Getting Stronger",
        description: "Reach 25 total damage.",
        icon: 'textures/sword.png',
        unlocked: false
    },
    round_5: {
        name: "Survivor",
        description: "Beat round 5.",
        icon: 'textures/shield.png',
        unlocked: false
    },
    round_10: {
        name: "Veteran",
        description: "Beat round 10.",
        icon: 'textures/shield.png',
        unlocked: false
    },
    round_15: {
        name: "Warrior",
        description: "Beat round 15.",
        icon: 'textures/shield.png',
        unlocked: false
    },
    round_20: {
        name: "Legend",
        description: "Beat round 20.",
        icon: 'textures/shield.png',
        unlocked: false
    },
    boss_killer: {
        name: "Close Call",
        description: "Kill a boss with only 1 HP left.",
        icon: 'textures/enemy.webp',
        unlocked: false
    }
};

function getAchievements() {
    return achievements;
}