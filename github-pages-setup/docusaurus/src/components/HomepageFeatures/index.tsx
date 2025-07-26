import React from 'react'
import clsx from 'clsx'
import styles from './styles.module.css'

type FeatureItem = {
  title: string
  Svg: React.ComponentType<React.ComponentProps<'svg'>>
  description: JSX.Element
}

const FeatureList: FeatureItem[] = [
  {
    title: 'Domain-Driven Design',
    Svg: require('@site/static/img/undraw_building_blocks.svg').default,
    description: (
      <>
        Each website gets its own isolated domain module with clean boundaries.
        No more tangled dependencies or cross-domain pollution.
      </>
    ),
  },
  {
    title: 'Real-Time WebSocket',
    Svg: require('@site/static/img/undraw_real_time_sync.svg').default,
    description: (
      <>
        Built-in WebSocket protocol for real-time communication, event streaming,
        and distributed test coordination across multiple browsers.
      </>
    ),
  },
  {
    title: 'Enterprise Ready',
    Svg: require('@site/static/img/undraw_security.svg').default,
    description: (
      <>
        Production-grade security, scalability, and monitoring. Includes failover
        support, rate limiting, and comprehensive observability.
      </>
    ),
  },
]

function Feature({ title, Svg, description }: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
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