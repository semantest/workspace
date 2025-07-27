import React from 'react'
import clsx from 'clsx'
import Link from '@docusaurus/Link'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import Layout from '@theme/Layout'
import HomepageFeatures from '@site/src/components/HomepageFeatures'

import styles from './index.module.css'

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext()
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <h1 className="hero__title">{siteConfig.title}</h1>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/getting-started/quick-start"
          >
            Get Started - 5min ⏱️
          </Link>
          <Link
            className="button button--primary button--lg margin-left--md"
            to="/docs/overview"
          >
            Read Documentation 📚
          </Link>
        </div>
      </div>
    </header>
  )
}

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext()
  return (
    <Layout
      title={`${siteConfig.title} - Browser Automation Testing Framework`}
      description="A modular, domain-driven testing framework for browser automation and distributed test execution"
    >
      <HomepageHeader />
      <main>
        <HomepageFeatures />
        
        <section className={styles.codeExample}>
          <div className="container">
            <h2>Simple and Powerful</h2>
            <p>Write expressive tests with our intuitive API</p>
            <div className="row">
              <div className="col col--6">
                <h3>TypeScript SDK</h3>
                <pre className={styles.codeBlock}>
                  <code>{`import { TestClient } from '@semantest/client'
import { GoogleImagesTest } from '@semantest/images.google.com'

const client = new TestClient({
  serverUrl: 'ws://localhost:3000'
})

const test = new GoogleImagesTest({
  query: 'test automation',
  downloadCount: 5
})

await client.run(test)`}</code>
                </pre>
              </div>
              <div className="col col--6">
                <h3>CLI Tool</h3>
                <pre className={styles.codeBlock}>
                  <code>{`# Install globally
npm install -g @semantest/cli

# Initialize project
semantest init my-tests

# Run tests
semantest test run --parallel 5

# Monitor in real-time
semantest monitor --real-time`}</code>
                </pre>
              </div>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  )
}