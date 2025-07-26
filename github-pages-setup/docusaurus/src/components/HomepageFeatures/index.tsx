import React from 'react'
import clsx from 'clsx'
import styles from './index.module.css'

type FeatureItem = {
  title: string
  icon: string
  description: JSX.Element
}

const FeatureList: FeatureItem[] = [
  {
    title: 'Domain-Driven Design',
    icon: '🏗️',
    description: (
      <>
        Each website gets its own isolated domain module with clean boundaries.
        No more tangled dependencies or cross-domain pollution.
      </>
    ),
  },
  {
    title: 'Real-Time WebSocket',
    icon: '⚡',
    description: (
      <>
        Built-in WebSocket protocol for real-time communication, event streaming,
        and distributed test coordination across multiple browsers.
      </>
    ),
  },
  {
    title: 'Enterprise Ready',
    icon: '🛡️',
    description: (
      <>
        Production-grade security, scalability, and monitoring. Includes failover
        support, rate limiting, and comprehensive observability.
      </>
    ),
  },
]

function Feature({ title, icon, description }: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <div className={styles.featureSvg} style={{ fontSize: '5rem' }}>{icon}</div>
      </div>
      <div className="text--center padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  )
}

export default function HomepageFeatures(): JSX.Element {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  )
}