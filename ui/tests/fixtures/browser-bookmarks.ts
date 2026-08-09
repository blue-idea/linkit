export const BROWSER_BOOKMARK_NEW_URL = 'https://browser-import.example.test/article';

/**
 * 组合 Chrome / Edge / Firefox 常见 Netscape 属性，验证解析器忽略非必要浏览器字段。
 */
export const BROWSER_BOOKMARKS_HTML = [
  '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
  '<!-- This is an automatically generated file. -->',
  '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
  '<TITLE>Bookmarks</TITLE>',
  '<H1>Bookmarks</H1>',
  '<DL><p>',
  '  <DT><H3 ADD_DATE="1786204800" LAST_MODIFIED="1786204800" PERSONAL_TOOLBAR_FOLDER="true">Browser Toolbar</H3>',
  '  <DL><p>',
  '    <DT><A HREF="https://vitejs.dev" ADD_DATE="1786204800" ICON="data:image/png;base64,ignored">Vite duplicate</A>',
  `    <DT><A HREF="${BROWSER_BOOKMARK_NEW_URL}" ADD_DATE="1786204801">Browser imported example</A>`,
  '  </DL><p>',
  '</DL><p>',
].join('\n');

/** 含虚拟根与普通子文件夹的 fixture，用于递归删除后再次导入回归。 */
export const BROWSER_BOOKMARKS_FOLDER_HTML = [
  '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
  '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
  '<TITLE>Bookmarks</TITLE>',
  '<H1>Bookmarks</H1>',
  '<DL><p>',
  '  <DT><H3 PERSONAL_TOOLBAR_FOLDER="true">Bookmarks Toolbar</H3>',
  '  <DL><p>',
  '    <DT><H3>Imported Folder</H3>',
  '    <DL><p>',
  `      <DT><A HREF="${BROWSER_BOOKMARK_NEW_URL}" ADD_DATE="1786204801">Browser imported example</A>`,
  '    </DL><p>',
  '  </DL><p>',
  '</DL><p>',
].join('\n');
