import { describe, expect, it } from 'vitest'

import { getBankNameFromFilename, parseQuestionsCsv } from '@/lib/csv'
import {
  FORMAT_BOLD,
  FORMAT_CODE,
  FORMAT_ITALIC,
  lexicalToPlainText,
  stringToLexical,
} from '@/lib/richtext'

describe('CSV parser', () => {
  it('parses valid rows including quoted commas and BOM', () => {
    const csv = [
      '\uFEFFquestion,answer_a,answer_b,answer_c,answer_d,answer_e,correct_answer',
      '"What is **2 + 2**, really?",1,2,3,4,5,d',
    ].join('\r\n')

    const result = parseQuestionsCsv(csv)
    expect(result.headerError).toBeNull()
    expect(result.rowErrors).toHaveLength(0)
    expect(result.validRows).toHaveLength(1)
    expect(result.validRows[0]).toMatchObject({
      question: 'What is **2 + 2**, really?',
      answerA: '1',
      answerD: '4',
      correctAnswer: 'D',
    })
  })

  it('rejects wrong header order', () => {
    const csv = 'answer_a,question,answer_b,answer_c,answer_d,answer_e,correct_answer\na,b,c,d,e,f,A'
    const result = parseQuestionsCsv(csv)
    expect(result.headerError).toContain('question,answer_a')
    expect(result.validRows).toHaveLength(0)
  })

  it('flags invalid correct_answer and derives bank name from filename', () => {
    const csv = [
      'question,answer_a,answer_b,answer_c,answer_d,answer_e,correct_answer',
      'Q1,a,b,c,d,e,Z',
    ].join('\n')
    const result = parseQuestionsCsv(csv)
    expect(result.headerError).toBeNull()
    expect(result.validRows).toHaveLength(0)
    expect(result.rowErrors).toHaveLength(1)
    expect(getBankNameFromFilename('biology_unit_1.CSV')).toBe('biology_unit_1')
  })

  it('allows blank answer_e in 7-column CSV and 6-column CSV without answer_e, while rejecting correct_answer=E when empty', () => {
    const sevenCol = [
      'question,answer_a,answer_b,answer_c,answer_d,answer_e,correct_answer',
      'Q1,a,b,c,d,,B',
      'Q2,a,b,c,d,,E',
    ].join('\n')
    const res7 = parseQuestionsCsv(sevenCol)
    expect(res7.headerError).toBeNull()
    expect(res7.validRows).toHaveLength(1)
    expect(res7.validRows[0].answerE).toBe('')
    expect(res7.rowErrors).toHaveLength(1)

    const sixCol = [
      'question,answer_a,answer_b,answer_c,answer_d,correct_answer',
      'Q3,a,b,c,d,C',
    ].join('\n')
    const res6 = parseQuestionsCsv(sixCol)
    expect(res6.headerError).toBeNull()
    expect(res6.validRows).toHaveLength(1)
    expect(res6.validRows[0]).toMatchObject({ answerE: '', correctAnswer: 'C' })
  })
})

describe('Rich text conversion', () => {
  it('converts markdown bold, italic, code, and headings to Lexical nodes', () => {
    const doc = stringToLexical('## Heading\nChoose the **bold** and *italic* `term`.')
    expect(doc.root.children).toHaveLength(2)
    expect(doc.root.children[0].type).toBe('heading')
    const para = doc.root.children[1]
    expect(para.type).toBe('paragraph')
    if (para.type === 'paragraph') {
      const boldNode = para.children.find((n) => n.type === 'text' && n.text === 'bold')
      const italicNode = para.children.find((n) => n.type === 'text' && n.text === 'italic')
      const codeNode = para.children.find((n) => n.type === 'text' && n.text === 'term')
      expect(boldNode && boldNode.type === 'text' ? boldNode.format & FORMAT_BOLD : 0).toBe(
        FORMAT_BOLD,
      )
      expect(italicNode && italicNode.type === 'text' ? italicNode.format & FORMAT_ITALIC : 0).toBe(
        FORMAT_ITALIC,
      )
      expect(codeNode && codeNode.type === 'text' ? codeNode.format & FORMAT_CODE : 0).toBe(
        FORMAT_CODE,
      )
    }
    expect(lexicalToPlainText(doc)).toBe('Heading Choose the bold and italic term.')
  })

  it('converts HTML bold and heading tags cleanly', () => {
    const doc = stringToLexical('<h3>Section</h3><p>Pick <strong>one</strong> option.</p>')
    expect(doc.root.children[0].type).toBe('heading')
    expect(lexicalToPlainText(doc)).toBe('Section Pick one option.')
  })
})
