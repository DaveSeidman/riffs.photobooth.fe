import test from "node:test";
import assert from "node:assert/strict";
import { questions, affinityFor } from "../src/experience/quiz.js";

test("all answer combinations produce the majority affinity, with no ties", () => {
  for (let bits = 0; bits < 8; bits++) {
    const answers = [bits & 1, (bits >> 1) & 1, (bits >> 2) & 1];
    const pulse = answers.filter(
      (a, i) => questions[i].options[a].affinity === "pulse",
    ).length;
    assert.equal(affinityFor(answers), pulse >= 2 ? "pulse" : "blush");
  }
  assert.throws(() => affinityFor([0, 1]));
  assert.throws(() => affinityFor([0, 1, 9]));
});

test('groups share exactly three questions and retain separate affinities', async () => {
  const { groupAffinities } = await import('../src/experience/quiz.js');
  assert.equal(questions.length, 3);
  for (const count of [1,2,3,4]) {
    const rows = [[0,1,0,1],[1,0,1,0],[0,1,0,1]].map(row=>row.slice(0,count));
    assert.deepEqual(groupAffinities(rows,count),Array.from({length:count},(_,i)=>i%2?'blush':'pulse'));
    assert.deepEqual(groupAffinities(rows.slice(0,2),count),[]);
    assert.deepEqual(groupAffinities([...rows,rows[0]],count),[]);
  }
  assert.deepEqual(groupAffinities([[0,1],[1],[0,1]],2),[]);
});
