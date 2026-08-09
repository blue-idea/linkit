package main

import (
	"reflect"
	"testing"
)

func TestBuildTrayCallbacksUsesShowWindowForDoubleClick(t *testing.T) {
	events := make([]string, 0, 2)

	callbacks := buildTrayCallbacks(
		func() { events = append(events, "show") },
		func() { events = append(events, "settings") },
		func() { events = append(events, "about") },
		func() { events = append(events, "quit") },
	)
	if callbacks.OnDoubleClick == nil {
		t.Fatal("double-click callback must be configured")
	}

	callbacks.OnDoubleClick()

	if !reflect.DeepEqual(events, []string{"show"}) {
		t.Fatalf("double-click events = %v, want [show]", events)
	}
}

func TestBuildTrayCallbacksShowsWindowBeforeOpeningSettings(t *testing.T) {
	events := make([]string, 0, 3)

	callbacks := buildTrayCallbacks(
		func() { events = append(events, "show") },
		func() { events = append(events, "settings") },
		func() { events = append(events, "about") },
		func() { events = append(events, "quit") },
	)
	if callbacks.OnSettings == nil {
		t.Fatal("settings callback must be configured")
	}

	callbacks.OnSettings()

	if !reflect.DeepEqual(events, []string{"show", "settings"}) {
		t.Fatalf("settings events = %v, want [show settings]", events)
	}
}

func TestBuildTrayCallbacksShowsWindowBeforeOpeningAbout(t *testing.T) {
	events := make([]string, 0, 3)

	callbacks := buildTrayCallbacks(
		func() { events = append(events, "show") },
		func() { events = append(events, "settings") },
		func() { events = append(events, "about") },
		func() { events = append(events, "quit") },
	)
	if callbacks.OnAbout == nil {
		t.Fatal("about callback must be configured")
	}

	callbacks.OnAbout()

	if !reflect.DeepEqual(events, []string{"show", "about"}) {
		t.Fatalf("about events = %v, want [show about]", events)
	}
}

func TestBuildTrayCallbacksRetainsQuitCallback(t *testing.T) {
	events := make([]string, 0, 1)

	callbacks := buildTrayCallbacks(
		func() { events = append(events, "show") },
		func() { events = append(events, "settings") },
		func() { events = append(events, "about") },
		func() { events = append(events, "quit") },
	)
	if callbacks.OnQuit == nil {
		t.Fatal("quit callback must be configured")
	}

	callbacks.OnQuit()

	if !reflect.DeepEqual(events, []string{"quit"}) {
		t.Fatalf("quit events = %v, want [quit]", events)
	}
}
