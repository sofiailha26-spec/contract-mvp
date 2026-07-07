'use client'
import React, { forwardRef, useEffect, useRef } from 'react'
import SignatureCanvas from 'react-signature-canvas'

interface Props {
  className?: string
}

export const SignaturePad = forwardRef<any, Props>((props, ref) => {
  const containerRef = useRef<HTMLDivElement>(null)
  
  // 我们通过内部持有一个 ref 或者结合传入的 ref 来强制调整 canvas 大小
  const internalRef = useRef<any>(null)

  useEffect(() => {
    // 监听窗口大小变化以重置画布比例，避免画笔漂移
    const resizeCanvas = () => {
      if (internalRef.current && containerRef.current) {
        const canvas = internalRef.current.getCanvas()
        const ratio = Math.max(window.devicePixelRatio || 1, 1)
        
        // 存储旧的签名数据
        const data = internalRef.current.toData()
        
        // 设置实际像素宽高
        canvas.width = containerRef.current.offsetWidth * ratio
        canvas.height = containerRef.current.offsetHeight * ratio
        
        // 获取绘图上下文并缩放
        canvas.getContext('2d').scale(ratio, ratio)
        
        // 恢复签名数据并清空重新绘制，避免空白
        internalRef.current.clear()
        internalRef.current.fromData(data)
      }
    }

    window.addEventListener('resize', resizeCanvas)
    
    // 初始化时调用一次
    // 稍微延迟一下确保 DOM 渲染完成
    setTimeout(resizeCanvas, 10)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

  // 合并 ref 处理
  const setRefs = (canvasRef: any) => {
    internalRef.current = canvasRef
    if (typeof ref === 'function') {
      ref(canvasRef)
    } else if (ref) {
      (ref as React.MutableRefObject<any>).current = canvasRef
    }
  }

  return (
    <div ref={containerRef} className="w-full h-48 bg-gray-50 rounded touch-none">
      <SignatureCanvas
        ref={setRefs}
        penColor="black"
        canvasProps={{ 
          className: `w-full h-full ${props.className || ''}`,
          style: { touchAction: 'none' } // 防止移动端滚动干扰
        }}
      />
    </div>
  )
})

SignaturePad.displayName = 'SignaturePad'
export default SignaturePad
