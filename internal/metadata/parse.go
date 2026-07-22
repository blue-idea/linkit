package metadata

import (
	"crypto/sha256"
	"encoding/hex"
	"io"
	"net/url"
	"strings"

	"github.com/blue-idea/collection/config"
	"golang.org/x/net/html"
)

type parsedPage struct {
	title       string
	description string
	faviconURL  string
	contentText string
	fingerprint string
}

func parseHTMLMetadata(body io.Reader, base *url.URL) (parsedPage, error) {
	root, err := html.Parse(body)
	if err != nil {
		return parsedPage{}, err
	}

	var titleBuilder strings.Builder
	var textBuilder strings.Builder
	description := ""
	favicon := ""
	inTitle := false
	skipDepth := 0

	var walk func(*html.Node)
	walk = func(node *html.Node) {
		if node.Type == html.ElementNode {
			name := strings.ToLower(node.Data)
			if name == "script" || name == "style" || name == "noscript" {
				skipDepth++
				for child := node.FirstChild; child != nil; child = child.NextSibling {
					walk(child)
				}
				skipDepth--
				return
			}
			if name == "title" {
				inTitle = true
			}
			if name == "meta" {
				if metaDescription(node) != "" {
					description = metaDescription(node)
				}
			}
			if name == "link" {
				if href := faviconHref(node); href != "" && favicon == "" {
					favicon = resolveURL(base, href)
				}
			}
		}
		if node.Type == html.TextNode && skipDepth == 0 {
			text := strings.Join(strings.Fields(node.Data), " ")
			if text == "" {
				return
			}
			if inTitle {
				if titleBuilder.Len() > 0 {
					titleBuilder.WriteByte(' ')
				}
				titleBuilder.WriteString(text)
			} else {
				if textBuilder.Len() > 0 {
					textBuilder.WriteByte(' ')
				}
				textBuilder.WriteString(text)
			}
		}
		for child := node.FirstChild; child != nil; child = child.NextSibling {
			walk(child)
		}
		if node.Type == html.ElementNode && strings.ToLower(node.Data) == "title" {
			inTitle = false
		}
	}
	walk(root)

	if favicon == "" && base != nil && (base.Scheme == "http" || base.Scheme == "https") {
		favicon = base.Scheme + "://" + base.Host + "/favicon.ico"
	}

	content := truncateRunes(textBuilder.String(), config.MetadataMaxContentRunes)
	sum := sha256.Sum256([]byte(content))
	return parsedPage{
		title:       strings.TrimSpace(titleBuilder.String()),
		description: strings.TrimSpace(description),
		faviconURL:  favicon,
		contentText: content,
		fingerprint: hex.EncodeToString(sum[:]),
	}, nil
}

func metaDescription(node *html.Node) string {
	name := ""
	content := ""
	for _, attr := range node.Attr {
		key := strings.ToLower(attr.Key)
		if key == "name" || key == "property" {
			name = strings.ToLower(strings.TrimSpace(attr.Val))
		}
		if key == "content" {
			content = attr.Val
		}
	}
	if name == "description" || name == "og:description" {
		return content
	}
	return ""
}

func faviconHref(node *html.Node) string {
	rel := ""
	href := ""
	for _, attr := range node.Attr {
		key := strings.ToLower(attr.Key)
		if key == "rel" {
			rel = strings.ToLower(attr.Val)
		}
		if key == "href" {
			href = attr.Val
		}
	}
	if href == "" {
		return ""
	}
	if strings.Contains(rel, "icon") || strings.Contains(rel, "apple-touch-icon") {
		return href
	}
	return ""
}

func resolveURL(base *url.URL, ref string) string {
	parsed, err := url.Parse(ref)
	if err != nil {
		return ""
	}
	if base == nil {
		return parsed.String()
	}
	return base.ResolveReference(parsed).String()
}

func truncateRunes(value string, limit int) string {
	if limit <= 0 {
		return ""
	}
	runes := []rune(value)
	if len(runes) <= limit {
		return value
	}
	return string(runes[:limit])
}
