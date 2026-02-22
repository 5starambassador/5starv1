'use client'

import { motion, Variants } from 'framer-motion'
import { ReactNode } from 'react'

interface PageAnimateProps {
    children: ReactNode
    className?: string
    stagger?: number
}

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08,
            delayChildren: 0.1
        }
    }
}

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15, scale: 0.98 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            type: "spring",
            stiffness: 120,
            damping: 18,
            mass: 1.1
        }
    }
}

export function PageAnimate({ children, className = "", stagger = 0.08 }: PageAnimateProps) {
    const variants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: stagger,
                delayChildren: 0.1
            }
        }
    }

    return (
        <motion.div
            variants={variants}
            initial="hidden"
            animate="visible"
            className={className}
        >
            {children}
        </motion.div>
    )
}

export function PageItem({ children, className = "" }: { children: ReactNode, className?: string }) {
    return (
        <motion.div variants={itemVariants} className={className}>
            {children}
        </motion.div>
    )
}
