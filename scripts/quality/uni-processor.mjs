import vue from 'eslint-plugin-vue'
// Keep source line numbers while checking every shipped conditional compilation target.
export function preprocess(text) {
  if (!/#(?:ifdef|ifndef)/.test(text)) return [text]
  return [new Set(['H5']), new Set(['MP', 'MP-WEIXIN']), new Set(['APP', 'APP-PLUS'])].map(
    (flags) => {
      const stack = [true]
      const output = text
        .split('\n')
        .map((line) => {
          const directive = line.match(
            /^\s*(?:\/\/|<!--)\s*#(ifdef|ifndef|endif)\b(.*?)(?:-->)?\s*$/,
          )
          if (directive) {
            if (directive[1] === 'endif') {
              if (stack.length === 1) throw Error('Unmatched uni #endif')
              stack.pop()
            } else {
              const expression = directive[2].trim()
              if (!/^[A-Z0-9_\s|&-]+$/.test(expression))
                throw Error('Unsupported uni condition: ' + expression)
              const matches = expression
                .split('||')
                .some((or) => or.split('&&').every((token) => flags.has(token.trim())))
              stack.push(stack.at(-1) && (directive[1] === 'ifndef' ? !matches : matches))
            }
            return ''
          }
          return stack.at(-1) ? line : ''
        })
        .join('\n')
      if (stack.length !== 1) throw Error('Unclosed uni conditional')
      return output
    },
  )
}
export default {
  preprocess,
  postprocess: (blocks) => [
    ...new Map(
      blocks
        .flatMap((block) => vue.processors['.vue'].postprocess([block]))
        .map((m) => [JSON.stringify([m.ruleId, m.line, m.column, m.message]), m]),
    ).values(),
  ],
  supportsAutofix: false,
}
