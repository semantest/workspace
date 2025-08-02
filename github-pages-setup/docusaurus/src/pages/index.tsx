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
        <h1 className="hero__title">Write Tests Like You Think</h1>
        <p className="hero__subtitle">
          No more XPath nightmares. No more broken selectors at 2 AM.<br/>
          Just natural language that actually works.
        </p>
        <div className={styles.codeExample} style={{ margin: '2rem 0' }}>
          <pre style={{ background: 'rgba(0,0,0,0.1)', padding: '1rem', borderRadius: '8px' }}>
            <code>{`await semantest.click("Click the login button");
await semantest.type("Enter email", "user@example.com");
await semantest.see("Welcome back!");`}</code>
          </pre>
        </div>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/getting-started/"
          >
            Start Your Journey - 5min ⏱️
          </Link>
          <Link
            className="button button--primary button--lg margin-left--md"
            to="/docs/tutorials/amazon-shopping"
          >
            Try Real-World Tutorial 🛒
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
            <h2>From Frustration to Joy in One Test</h2>
            <div className="row">
              <div className="col col--6">
                <h3>❌ The Old Way (Selenium)</h3>
                <pre className={styles.codeBlock} style={{ background: '#fff5f5' }}>
                  <code>{`// 😱 This breaks every UI update
driver.findElement(By.xpath(
  "//div[@class='btn-container-v2']" +
  "//button[contains(@class, 'primary')]" +
  "//span[text()='Login']"
));

// 🤯 Good luck debugging this at 2 AM
wait.until(ExpectedConditions
  .presenceOfElementLocated(
    By.cssSelector("#app > div:nth-child(3) " +
    "> form > button.submit-btn")
));`}</code>
                </pre>
              </div>
              <div className="col col--6">
                <h3>✅ The Semantest Way</h3>
                <pre className={styles.codeBlock} style={{ background: '#f0fff4' }}>
                  <code>{`// 😊 This just works
await semantest.click("Click login");
await semantest.type("Enter email", email);
await semantest.click("Submit form");

// 🎉 Even your PM can read this
await semantest.see("Welcome back!");
await semantest.click("Go to dashboard");
await semantest.waitFor("Dashboard to load");`}</code>
                </pre>
              </div>
            </div>
          </div>
        </section>

        <section style={{ padding: '4rem 0', background: '#f5f6f7' }}>
          <div className="container">
            <h2 style={{ textAlign: 'center', marginBottom: '3rem' }}>Real Success Stories</h2>
            <div className="row">
              <div className="col col--4">
                <div style={{ padding: '2rem', background: 'white', borderRadius: '8px', height: '100%' }}>
                  <h3>40 Hours → 2 Hours</h3>
                  <blockquote>
                    "We went from 40 hours/week fixing broken tests to just 2 hours. 
                    Our 500+ Selenium tests were a nightmare. Now they self-heal when the UI changes."
                  </blockquote>
                  <p><strong>Sarah Chen</strong><br/>QA Lead, PayFlow</p>
                  <Link to="/docs/success-stories#sarahs-story">Read Sarah's Story →</Link>
                </div>
              </div>
              <div className="col col--4">
                <div style={{ padding: '2rem', background: 'white', borderRadius: '8px', height: '100%' }}>
                  <h3>Non-Dev to Automation Pro</h3>
                  <blockquote>
                    "I'm in marketing, not engineering. But with Semantest, I automated 
                    our entire reporting workflow. Saved 15 hours every week!"
                  </blockquote>
                  <p><strong>Mike Rodriguez</strong><br/>Marketing Manager, EcoShop</p>
                  <Link to="/docs/success-stories#mikes-journey">Read Mike's Journey →</Link>
                </div>
              </div>
              <div className="col col--4">
                <div style={{ padding: '2rem', background: 'white', borderRadius: '8px', height: '100%' }}>
                  <h3>10,000 Tests Daily</h3>
                  <blockquote>
                    "200+ developers, 50 apps, 10,000 tests running daily. 
                    Semantest saved us $1.5M annually in maintenance costs."
                  </blockquote>
                  <p><strong>Alex Thompson</strong><br/>VP Engineering, TechCorp</p>
                  <Link to="/docs/success-stories#enterprise-scale">Read TechCorp's Story →</Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  )
}