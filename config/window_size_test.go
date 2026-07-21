package config

import "testing"

// REQ-031-AC-002：默认 Medium 映射 1280×800。
func TestResolveWindowSizeMediumDefault(t *testing.T) {
	width, height, ok := ResolveWindowSize(UiSizeMedium)
	if !ok {
		t.Fatal("medium must resolve")
	}
	if width != AppWidth || height != AppHeight {
		t.Fatalf("medium got %dx%d, want %dx%d", width, height, AppWidth, AppHeight)
	}
}

// REQ-031-AC-003：四档预设宽高。
func TestResolveWindowSizePresets(t *testing.T) {
	cases := []struct {
		size   string
		width  int
		height int
	}{
		{UiSizeSmall, 1152, 720},
		{UiSizeMedium, 1280, 800},
		{UiSizeLarge, 1536, 960},
		{UiSizeXLarge, 1792, 1120},
	}
	for _, tc := range cases {
		width, height, ok := ResolveWindowSize(tc.size)
		if !ok {
			t.Fatalf("%s must resolve", tc.size)
		}
		if width != tc.width || height != tc.height {
			t.Fatalf("%s got %dx%d, want %dx%d", tc.size, width, height, tc.width, tc.height)
		}
	}
}

func TestResolveWindowSizeRejectsUnknown(t *testing.T) {
	if _, _, ok := ResolveWindowSize("huge"); ok {
		t.Fatal("unknown uiSize must not resolve")
	}
}
