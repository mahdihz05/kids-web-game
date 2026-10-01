/** Compare only the same game and scoring version, with one vote per child. */
export function summarizeCohorts<T extends {
  childId: string; storyId: string; scoringVersion: string; age: number;
  schoolId: string; schoolName: string; completedAt: string | null;
  percent: number; skills: Record<string, number | null>;
}>(runs: T[], key: 'age' | 'schoolName') {
  const groups = new Map<string, T[]>();
  for (const run of runs) {
    const groupId = JSON.stringify([key === 'age' ? run.age : run.schoolId, run.storyId, run.scoringVersion]);
    const group = groups.get(groupId) ?? [];
    group.push(run);
    groups.set(groupId, group);
  }
  return [...groups.entries()].map(([id, items]) => {
    const completed = items.filter((r) => r.completedAt);
    const average = (values: number[]) => values.length
      ? Math.round(values.reduce((sum, v) => sum + v, 0) / values.length) : null;
    const perChild = (read: (run: T) => number | null) => {
      const children = new Map<string, number[]>();
      for (const run of completed) {
        const value = read(run);
        if (value === null) continue;
        const values = children.get(run.childId) ?? [];
        values.push(value);
        children.set(run.childId, values);
      }
      return { percent: average([...children.values()].map((values) => values.reduce((s, v) => s + v, 0) / values.length)), children: children.size };
    };
    return {
      id, name: String(items[0][key]), storyId: items[0].storyId,
      scoringVersion: items[0].scoringVersion,
      children: new Set(items.map((r) => r.childId)).size,
      runs: items.length, completed: completed.length,
      averagePercent: average(completed.map((r) => r.percent)),
      balanced: perChild((r) => r.percent),
      skills: Object.fromEntries([...new Set(completed.flatMap((r) => Object.keys(r.skills)))].map((skill) => [skill, perChild((r) => r.skills[skill] ?? null)])),
    };
  });
}
