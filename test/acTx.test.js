import { strict as assert } from 'node:assert';
import acTx from '../src/acTx.js'

describe('acTx ', () => {
  let state = { res: 0}
  let input
  describe('method does not fail', () => {
    before(() => {
      state = { res: 0 }
      input = [
        {
          method: (s) => state.res += s,
          args: [1],
          env: this,
          r_method: (s) => state.res -= s,
          r_args: [1],
          r_env: this,
        },
        {
          method: (s) => state.res += s,
          args: [2],
          env: this,
          r_method: (s) => state.res -= s,
          r_args: [2],
          r_env: this,
        },
        {
          method: (s) => state.res += s,
          args: [3],
          env: this,
          r_method: (s) => state.res -= s,
          r_args: [3],
          r_env: this,
        },
      ]
      acTx(input)
    })

    it('calls method only', () => assert.deepStrictEqual(state, { res: 6 }))
  })

  describe('method fails', () => {
    before(() => {
      state = { res: 0 }
      input = [
        {
          method: (s) => state.res += s,
          args: [1],
          env: this,
          r_method: (s) => state.res -= s,
          r_args: [1],
          r_env: this,
        },
        {
          method: (s) => state.res += s,
          args: [2],
          env: this,
          r_method: (s) => state.res -= s,
          r_args: [2],
          r_env: this,
        },
        {
          method: (s) => state.res += s,
          args: [3],
          env: this,
          r_method: (s) => state.res -= s,
          r_args: [3],
          r_env: this,
        },
        {
          method: () => { throw new Err('teset') },
          args: [4],
          env: this,
          r_method: (s) => state.res -= s,
          r_args: [4],
          r_env: this,
        },
        {
          method: (s) => state.res += s,
          args: [5],
          env: this,
          r_method: (s) => state.res -= s,
          r_args: [5],
          r_env: this,
        }
      ]

      acTx(input)
    })

    it('rolls back to initial state', () => assert.deepStrictEqual(state, { res: 0 }))
  })

  describe('rollback fails', () => {
    before(() => {
      state = { res: 0 }
      input = [
        {
          method: (s) => state.res += s,
          args: [1],
          env: this,
          r_method: (s) => state.res -= s,
          r_args: [1],
          r_env: this,
        },
        {
          method: (s) => state.res += s,
          args: [2],
          env: this,
          r_method: (s) => state.res -= s,
          r_args: [2],
          r_env: this,
        },
        {
          method: (s) => state.res += s,
          args: [3],
          env: this,
          r_method: () => { throw new Error('Rollback Test') },
          r_args: [3],
          r_env: this,
        },
        {
          method: () => { throw new Error('teset') },
          args: [4],
          env: this,
          r_method: (s) => state.res -= s,
          r_args: [4],
          r_env: this,
        },
        {
          method: (s) => state.res += s,
          args: [5],
          env: this,
          r_method: (s) => state.res -= s,
          r_args: [5],
          r_env: this,
        }
      ]
    })

    it('throws an error and corrupts the state', () => assert.throws(() => acTx(input), 'RollBack Test'))
    it('corrupts state', () => assert.deepStrictEqual(state, { res: 6 }))
  })
})
