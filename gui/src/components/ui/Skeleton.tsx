import React from 'react'

const Skeleton = ({ count = 1, height = '1em' }) => {
  return (
    <div className='skeleton-container'>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className='skeleton-item' style={{ height }} />
      ))}
    </div>
  )
}

export default Skeleton
