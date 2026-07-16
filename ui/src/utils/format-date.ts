export function formatDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  return date.getFullYear() === now.getFullYear()
    ? `${month}月${day}日`
    : `${date.getFullYear()}/${month}/${day}`;
}
