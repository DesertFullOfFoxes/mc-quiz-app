export interface LexicalTextNode {
  type: 'text'
  detail: number
  format: number
  mode: 'normal' | 'token' | 'segmented'
  style: string
  text: string
  version: number
}

export interface LexicalLineBreakNode {
  type: 'linebreak'
  version: number
}

export type LexicalInlineNode = LexicalTextNode | LexicalLineBreakNode

export interface LexicalParagraphNode {
  type: 'paragraph'
  children: LexicalInlineNode[]
  direction: 'ltr' | 'rtl' | null
  format: '' | 'left' | 'start' | 'center' | 'right' | 'end' | 'justify'
  indent: number
  textFormat: number
  textStyle: string
  version: number
}

export interface LexicalHeadingNode {
  type: 'heading'
  tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  children: LexicalInlineNode[]
  direction: 'ltr' | 'rtl' | null
  format: '' | 'left' | 'start' | 'center' | 'right' | 'end' | 'justify'
  indent: number
  version: number
}

export interface LexicalListItemNode {
  type: 'listitem'
  value: number
  children: LexicalInlineNode[]
  direction: 'ltr' | 'rtl' | null
  format: '' | 'left' | 'start' | 'center' | 'right' | 'end' | 'justify'
  indent: number
  version: number
}

export interface LexicalListNode {
  type: 'list'
  listType: 'bullet' | 'number' | 'check'
  tag: 'ul' | 'ol'
  start: number
  children: LexicalListItemNode[]
  direction: 'ltr' | 'rtl' | null
  format: '' | 'left' | 'start' | 'center' | 'right' | 'end' | 'justify'
  indent: number
  version: number
}

export type LexicalBlockNode =
  | LexicalParagraphNode
  | LexicalHeadingNode
  | LexicalListNode

export interface LexicalDocument {
  root: {
    type: 'root'
    children: LexicalBlockNode[]
    direction: 'ltr' | 'rtl' | null
    format: '' | 'left' | 'start' | 'center' | 'right' | 'end' | 'justify'
    indent: number
    version: number
  }
}

export const FORMAT_BOLD = 1
export const FORMAT_ITALIC = 2
export const FORMAT_STRIKETHROUGH = 4
export const FORMAT_UNDERLINE = 8
export const FORMAT_CODE = 16

function makeTextNode(text: string, format = 0): LexicalTextNode {
  return {
    type: 'text',
    detail: 0,
    format,
    mode: 'normal',
    style: '',
    text,
    version: 1,
  }
}

function makeParagraph(children: LexicalInlineNode[]): LexicalParagraphNode {
  return {
    type: 'paragraph',
    children,
    direction: 'ltr',
    format: '',
    indent: 0,
    textFormat: 0,
    textStyle: '',
    version: 1,
  }
}

function makeHeading(
  tag: 'h2' | 'h3' | 'h4',
  children: LexicalInlineNode[],
): LexicalHeadingNode {
  return {
    type: 'heading',
    tag,
    children,
    direction: 'ltr',
    format: '',
    indent: 0,
    version: 1,
  }
}

/**
 * Parse inline Markdown (`**bold**`, `*italic*`, `__underline__`, `~~strike~~`, `` `code` ``)
 * and basic inline HTML (`<b>`, `<strong>`, `<i>`, `<em>`, `<u>`, `<s>`, `<code>`, `<br>`)
 * into Lexical inline nodes.
 */
function parseInlineText(input: string, baseFormat = 0): LexicalInlineNode[] {
  const nodes: LexicalInlineNode[] = []

  const tokenRegex =
    /(<br\s*\/?>)|(<(strong|b|em|i|u|s|del|code)\b[^>]*>([\s\S]*?)<\/\3>)|(\*\*([^*]+)\*\*)|(__([^_]+)__)|(~~([^~]+)~~)|(`([^`]+)`)|(\*([^*\n]+)\*)/gi

  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = tokenRegex.exec(input)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(makeTextNode(input.slice(lastIndex, match.index), baseFormat))
    }

    if (match[1]) {
      nodes.push({ type: 'linebreak', version: 1 })
    } else if (match[2]) {
      const tag = match[3].toLowerCase()
      const inner = match[4]
      let addedFormat = 0
      if (tag === 'strong' || tag === 'b') addedFormat = FORMAT_BOLD
      else if (tag === 'em' || tag === 'i') addedFormat = FORMAT_ITALIC
      else if (tag === 'u') addedFormat = FORMAT_UNDERLINE
      else if (tag === 's' || tag === 'del') addedFormat = FORMAT_STRIKETHROUGH
      else if (tag === 'code') addedFormat = FORMAT_CODE
      nodes.push(...parseInlineText(inner, baseFormat | addedFormat))
    } else if (match[5]) {
      nodes.push(...parseInlineText(match[6], baseFormat | FORMAT_BOLD))
    } else if (match[7]) {
      nodes.push(...parseInlineText(match[8], baseFormat | FORMAT_UNDERLINE))
    } else if (match[9]) {
      nodes.push(...parseInlineText(match[10], baseFormat | FORMAT_STRIKETHROUGH))
    } else if (match[11]) {
      nodes.push(makeTextNode(match[12], baseFormat | FORMAT_CODE))
    } else if (match[13]) {
      nodes.push(...parseInlineText(match[14], baseFormat | FORMAT_ITALIC))
    }

    lastIndex = tokenRegex.lastIndex
  }

  if (lastIndex < input.length) {
    nodes.push(makeTextNode(input.slice(lastIndex), baseFormat))
  }

  if (nodes.length === 0) {
    nodes.push(makeTextNode(input, baseFormat))
  }

  return nodes
}

/**
 * Convert a CSV question string (plain text, Markdown, or basic HTML)
 * into a Payload-compatible Lexical richText document.
 */
export function stringToLexical(rawInput: string): LexicalDocument {
  // Normalize block HTML tags like <p>, <h1>-<h4>, <div> into newline-separated blocks
  const normalized = rawInput
    .replace(/\r\n/g, '\n')
    .replace(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi, '\n## $1\n')
    .replace(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n')
    .replace(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n')
    .replace(/<h4\b[^>]*>([\s\S]*?)<\/h4>/gi, '\n#### $1\n')
    .replace(/<\/p>\s*<p\b[^>]*>/gi, '\n')
    .replace(/<\/?(p|div)\b[^>]*>/gi, '\n')
    .trim()

  const lines = normalized.split('\n').filter((line, idx, arr) => {
    if (line.trim().length > 0) return true
    // Collapse consecutive empty lines
    return idx > 0 && idx < arr.length - 1 && arr[idx - 1].trim().length > 0
  })

  const children: LexicalBlockNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i].trim()
    if (!line) {
      i++
      continue
    }

    // Markdown headings -> Payload default Lexical headings (h2/h3/h4)
    const headingMatch = /^(#{1,4})\s+(.+)$/.exec(line)
    if (headingMatch) {
      const level = headingMatch[1].length
      const tag: 'h2' | 'h3' | 'h4' = level <= 2 ? 'h2' : level === 3 ? 'h3' : 'h4'
      children.push(makeHeading(tag, parseInlineText(headingMatch[2])))
      i++
      continue
    }

    // Bullet list items
    if (/^[-*]\s+/.test(line)) {
      const items: LexicalListItemNode[] = []
      let itemIndex = 1
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        const content = lines[i].trim().replace(/^[-*]\s+/, '')
        items.push({
          type: 'listitem',
          value: itemIndex++,
          children: parseInlineText(content),
          direction: 'ltr',
          format: '',
          indent: 0,
          version: 1,
        })
        i++
      }
      children.push({
        type: 'list',
        listType: 'bullet',
        tag: 'ul',
        start: 1,
        children: items,
        direction: 'ltr',
        format: '',
        indent: 0,
        version: 1,
      })
      continue
    }

    children.push(makeParagraph(parseInlineText(line)))
    i++
  }

  if (children.length === 0) {
    children.push(makeParagraph([makeTextNode(rawInput.trim())]))
  }

  return {
    root: {
      type: 'root',
      children,
      direction: 'ltr',
      format: '',
      indent: 0,
      version: 1,
    },
  }
}

/**
 * Recursively extract plain text from a Lexical richText value (or pass through a string).
 */
export function lexicalToPlainText(value: unknown): string {
  if (!value) return ''
  if (typeof value === 'string') return value

  const parts: string[] = []

  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') return
    const record = node as Record<string, unknown>

    if (record.type === 'text' && typeof record.text === 'string') {
      parts.push(record.text)
      return
    }
    if (record.type === 'linebreak') {
      parts.push(' ')
      return
    }
    if (record.type === 'tab') {
      parts.push(' ')
      return
    }

    const children = Array.isArray(record.children) ? record.children : null
    if (children) {
      for (const child of children) {
        walk(child)
      }
      if (
        record.type === 'paragraph' ||
        record.type === 'heading' ||
        record.type === 'listitem'
      ) {
        parts.push(' ')
      }
    } else if (record.root) {
      walk(record.root)
    }
  }

  walk(value)
  return parts.join('').replace(/\s+/g, ' ').trim()
}
