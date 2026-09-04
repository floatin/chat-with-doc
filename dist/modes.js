export const MODES = {
    discuss: {
        name: "discuss",
        skill: "mode-discuss",
        lease: false,
        defaultEarlyStop: "决策收敛，或路线被证伪",
    },
    design: {
        name: "design",
        skill: "mode-design",
        lease: false,
        defaultEarlyStop: "DESIGN.md 评审通过",
    },
    experiment: {
        name: "experiment",
        skill: "mode-experiment",
        lease: false,
        defaultEarlyStop: "可行性结论明确 (可行/不可行)",
    },
    produce: {
        name: "produce",
        skill: "mode-produce",
        lease: true,
        defaultEarlyStop: "所有任务完成且测试通过",
    },
    maintain: {
        name: "maintain",
        skill: "mode-maintain",
        lease: true,
        defaultEarlyStop: "问题闭环",
    },
};
export function getMode(name) {
    return MODES[name];
}
export function listModes() {
    return Object.keys(MODES);
}
