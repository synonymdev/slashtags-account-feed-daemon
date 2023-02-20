export default function(calls) {
  if (calls.length === 0) throw new Error('No transactions to execute')
  let called = 0;
  for (let i = 0; i < calls.length; i++) {
    const { method, args, env } = calls[i]

    try {
      method.apply(env, args)
    } catch (e) {
      for (let j = called - 1; j >= 0; j--) {
        const { r_method, r_args, r_env } = calls[j]
        r_method.apply(r_env, r_args)
      }
      return
    }
    called++
  }
}
