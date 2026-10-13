import { actionValid } from './core.mjs';

export const COMMANDS = {
  attack: { name: '攻擊', target: 'enemy', cost: '普通攻擊' },
  frost: { name: '霜華', target: 'all', cost: '12 真氣・敵方全體' },
  heal: { name: '回春', target: 'hero', cost: '10 真氣・回復生命' },
  potion: { name: '回元丹', target: 'hero', cost: '消耗 1 顆丹藥' },
  guard: { name: '防禦', target: 'none', cost: '減少傷害・恢復真氣' },
  flee: { name: '撤退', target: 'none', cost: '退出這場戰鬥' },
};

export function emptyCommand() {
  return { phase: 'command', action: null, target: null, battleId: null, round: null };
}

export function beginCommand(state, action) {
  const error = actionValid(state, action);
  if (error) throw Error(error);
  return {
    phase: COMMANDS[action].target === 'none' ? 'confirm' : 'target',
    action,
    target: null,
    battleId: state.activeBattle.id,
    round: state.activeBattle.round,
  };
}

function validateDraft(state, draft) {
  const battle = state.activeBattle;
  if (!battle || battle.id !== draft.battleId || battle.round !== draft.round) {
    throw Error('回合已經改變，請重新選擇指令。');
  }
  const error = actionValid(state, draft.action);
  if (error) throw Error(error);
}

export function chooseCommandTarget(state, draft, target) {
  validateDraft(state, draft);
  const kind = COMMANDS[draft.action].target;
  if (kind === 'enemy' || kind === 'all') {
    if (!Number.isInteger(target) || !(state.activeBattle.enemies[target]?.hp > 0)) {
      throw Error('請選擇仍在場上的敵人。');
    }
  } else if (kind === 'hero' && target !== 'hero') {
    throw Error('這個招式需要選擇自己的角色。');
  }
  return { ...draft, phase: 'confirm', target: kind === 'all' ? 'all' : target };
}

export function confirmedCommand(state, draft) {
  validateDraft(state, draft);
  if (draft.phase !== 'confirm') throw Error('請先選擇目標，再確認出招。');
  const kind = COMMANDS[draft.action].target;
  if (kind === 'enemy' && !(state.activeBattle.enemies[draft.target]?.hp > 0)) {
    throw Error('目標已失效，請重新選擇。');
  }
  if (kind === 'hero' && draft.target !== 'hero') throw Error('請先選擇自己的角色。');
  if (kind === 'all' && draft.target !== 'all') throw Error('請先選擇敵方目標。');
  return { action: draft.action, target: kind === 'enemy' ? draft.target : 0 };
}

export function commandSummary(state, draft) {
  if (!draft.action) return '先選擇指令';
  const action = COMMANDS[draft.action];
  if (draft.phase === 'target') return action.name + ' → ' + (action.target === 'hero' ? '點選自己' : '點選敵人');
  const target = action.target === 'none' ? '' : draft.target === 'all' ? '敵方全體' : draft.target === 'hero' ? state.name : state.activeBattle.enemies[draft.target]?.name;
  return action.name + (target ? ' → ' + target : '') + ' · ' + action.cost;
}
