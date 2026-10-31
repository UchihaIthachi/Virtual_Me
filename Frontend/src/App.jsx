import { Loader } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Leva } from 'leva'
import { Suspense } from 'react'
import { Experience } from './components/Experience'
import { UI } from './components/UI'
import ErrorBoundary from './components/ErrorBoundary'

function App() {
  return (
    <>
      <Loader />
      <Leva hidden />
      <UI />
      <ErrorBoundary
        fallback={
          <div className='fixed inset-0 grid place-items-center p-6 text-center text-white/80'>
            The 3D avatar couldn&apos;t load on this device, but you can still ask me questions below.
          </div>
        }
      >
        <Canvas shadows camera={{ position: [0, 0, 1], fov: 40 }}>
          <Suspense fallback={null}>
            <Experience />
          </Suspense>
        </Canvas>
      </ErrorBoundary>
    </>
  )
}

export default App
