import styles from './layout.module.css';

export default function ApplicationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={styles.desktopShell}>{children}</div>;
}

