'use client'

import * as Lucide from 'lucide-react'
import { type ComponentProps, forwardRef } from 'react'

type LucideName = keyof typeof Lucide

export interface IconProps extends Omit<ComponentProps<typeof Lucide.Activity>, 'name' | 'ref'> {
  name: LucideName
}

/**
 * Единая обёртка над lucide-react: дефолтный strokeWidth=1.75.
 * Так все иконки приложения выглядят одинаково.
 */
export const Icon = forwardRef<SVGSVGElement, IconProps>(
  ({ name, strokeWidth = 1.75, size = 24, ...rest }, ref) => {
    const Component = Lucide[name] as typeof Lucide.Activity | undefined
    if (!Component) {
      console.warn(`<Icon name="${name}" /> — иконка не найдена в lucide-react`)
      return null
    }
    return <Component ref={ref} strokeWidth={strokeWidth} size={size} {...rest} />
  }
)
Icon.displayName = 'Icon'
