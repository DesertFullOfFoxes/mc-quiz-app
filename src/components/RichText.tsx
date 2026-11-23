import React from 'react'

import {
  FORMAT_BOLD,
  FORMAT_CODE,
  FORMAT_ITALIC,
  FORMAT_STRIKETHROUGH,
  FORMAT_UNDERLINE,
} from '@/lib/richtext'

interface RichTextProps {
  value: unknown
  variant?: 'block' | 'inline'
  className?: string
}

interface GenericLexicalNode {
  type?: string
  text?: string
  format?: number | string
  tag?: string
  listType?: string
  children?: GenericLexicalNode[]
}

function renderFormattedText(text: string, format: number, key: React.Key): React.ReactNode {
  let content: React.ReactNode = text

  if (format & FORMAT_CODE) {
    content = <code className="rt-code">{content}</code>
  }
  if (format & FORMAT_BOLD) {
    content = <strong>{content}</strong>
  }
  if (format & FORMAT_ITALIC) {
    content = <em>{content}</em>
  }
  if (format & FORMAT_UNDERLINE) {
    content = <u>{content}</u>
  }
  if (format & FORMAT_STRIKETHROUGH) {
    content = <s>{content}</s>
  }

  return <React.Fragment key={key}>{content}</React.Fragment>
}

function renderInlineNodes(nodes: GenericLexicalNode[] | undefined): React.ReactNode {
  if (!nodes || nodes.length === 0) return null
  return nodes.map((node, index) => {
    if (node.type === 'text') {
      const formatNum = typeof node.format === 'number' ? node.format : 0
      return renderFormattedText(node.text ?? '', formatNum, index)
    }
    if (node.type === 'linebreak') {
      return <br key={index} />
    }
    if (node.type === 'tab') {
      return <React.Fragment key={index}>&nbsp;&nbsp;</React.Fragment>
    }
    if (node.children) {
      return <React.Fragment key={index}>{renderInlineNodes(node.children)}</React.Fragment>
    }
    return null
  })
}

export function RichText({ value, variant = 'block', className = '' }: RichTextProps) {
  if (!value) return null
  if (typeof value === 'string') {
    return <span className={className}>{value}</span>
  }

  const root = (value as { root?: GenericLexicalNode })?.root
  const blocks = root?.children
  if (!Array.isArray(blocks) || blocks.length === 0) return null

  if (variant === 'inline') {
    return (
      <span className={`rt-inline ${className}`.trim()}>
        {blocks.map((block, index) => (
          <React.Fragment key={index}>
            {index > 0 ? ' ' : null}
            {block.type === 'list' && Array.isArray(block.children)
              ? block.children.map((item, idx) => (
                  <React.Fragment key={idx}>
                    {idx > 0 ? ' · ' : null}
                    {renderInlineNodes(item.children)}
                  </React.Fragment>
                ))
              : renderInlineNodes(block.children)}
          </React.Fragment>
        ))}
      </span>
    )
  }

  return (
    <div className={`rt-block ${className}`.trim()}>
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          const tag = block.tag ?? 'h2'
          if (tag === 'h1' || tag === 'h2') {
            return (
              <h2 key={index} className="rt-h2">
                {renderInlineNodes(block.children)}
              </h2>
            )
          }
          if (tag === 'h3') {
            return (
              <h3 key={index} className="rt-h3">
                {renderInlineNodes(block.children)}
              </h3>
            )
          }
          return (
            <h4 key={index} className="rt-h4">
              {renderInlineNodes(block.children)}
            </h4>
          )
        }

        if (block.type === 'list') {
          const ListTag = block.tag === 'ol' || block.listType === 'number' ? 'ol' : 'ul'
          return (
            <ListTag key={index} className="rt-list">
              {(block.children ?? []).map((item, idx) => (
                <li key={idx}>{renderInlineNodes(item.children)}</li>
              ))}
            </ListTag>
          )
        }

        return (
          <p key={index} className="rt-p">
            {renderInlineNodes(block.children)}
          </p>
        )
      })}
    </div>
  )
}
