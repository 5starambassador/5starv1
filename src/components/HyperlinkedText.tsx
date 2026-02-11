'use client'

import React from 'react'

interface HyperlinkedTextProps {
    text: string
    className?: string
}

export function HyperlinkedText({ text, className }: HyperlinkedTextProps) {
    if (!text) return null

    // Regex to find URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g

    // Split text by URLs
    const parts = text.split(urlRegex)

    return (
        <span className={className}>
            {parts.map((part, i) => {
                if (part.match(urlRegex)) {
                    return (
                        <a
                            key={i}
                            href={part}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-ui-primary underline hover:text-ui-primary/80 break-all"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {part}
                        </a>
                    )
                }
                return part
            })}
        </span>
    )
}
