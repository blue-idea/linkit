#import <Cocoa/Cocoa.h>
#import <dispatch/dispatch.h>
#include <stdbool.h>

extern void linkitDarwinTrayMenuSelected(int menuID);
extern void linkitDarwinTrayDoubleClicked(void);

static NSStatusItem *linkitStatusItem;
static NSMenu *linkitStatusMenu;

@interface LinkitTrayTarget : NSObject
@end

@implementation LinkitTrayTarget
- (void)handleMenuItem:(NSMenuItem *)sender {
	linkitDarwinTrayMenuSelected((int)sender.tag);
}

- (void)handleStatusItem:(NSStatusBarButton *)sender {
	NSEvent *event = [NSApp currentEvent];
	if (event.type == NSEventTypeLeftMouseUp && event.clickCount >= 2) {
		linkitDarwinTrayDoubleClicked();
		return;
	}
	[linkitStatusItem popUpStatusItemMenu:linkitStatusMenu];
}
@end

static LinkitTrayTarget *linkitTrayTarget;

static void linkitRunOnMainSync(dispatch_block_t block) {
	if ([NSThread isMainThread]) {
		block();
		return;
	}
	dispatch_sync(dispatch_get_main_queue(), block);
}

bool linkitCreateStatusTray(const char *settingsTitle, const char *quitTitle, const char *tooltip, const void *iconBytes, int iconLen) {
	__block bool created = false;
	linkitRunOnMainSync(^{
		if (linkitStatusItem != nil) {
			created = true;
			return;
		}

		linkitTrayTarget = [LinkitTrayTarget new];
		linkitStatusItem = [[NSStatusBar systemStatusBar] statusItemWithLength:NSSquareStatusItemLength];
		if (linkitStatusItem == nil) {
			return;
		}

		if (tooltip != NULL && linkitStatusItem.button != nil) {
			linkitStatusItem.button.toolTip = [NSString stringWithUTF8String:tooltip];
		}

		if (iconBytes != NULL && iconLen > 0 && linkitStatusItem.button != nil) {
			NSData *imageData = [NSData dataWithBytes:iconBytes length:(NSUInteger)iconLen];
			NSImage *image = [[NSImage alloc] initWithData:imageData];
			if (image != nil) {
				image.size = NSMakeSize(20.0, 20.0);
				image.template = YES;
				linkitStatusItem.button.image = image;
			}
		}

		NSString *settingsText = [NSString stringWithUTF8String:settingsTitle];
		NSString *quitText = [NSString stringWithUTF8String:quitTitle];
		linkitStatusMenu = [[NSMenu alloc] initWithTitle:@"Linkit"];

		NSMenuItem *settingsItem = [[NSMenuItem alloc] initWithTitle:settingsText action:@selector(handleMenuItem:) keyEquivalent:@""];
		settingsItem.tag = 1;
		settingsItem.target = linkitTrayTarget;
		[linkitStatusMenu addItem:settingsItem];

		NSMenuItem *quitItem = [[NSMenuItem alloc] initWithTitle:quitText action:@selector(handleMenuItem:) keyEquivalent:@""];
		quitItem.tag = 2;
		quitItem.target = linkitTrayTarget;
		[linkitStatusMenu addItem:quitItem];

		if (linkitStatusItem.button != nil) {
			linkitStatusItem.button.target = linkitTrayTarget;
			linkitStatusItem.button.action = @selector(handleStatusItem:);
			[linkitStatusItem.button sendActionOn:(NSEventMaskLeftMouseUp | NSEventMaskRightMouseUp)];
		}
		created = true;
	});
	return created;
}

void linkitDestroyStatusTray(void) {
	linkitRunOnMainSync(^{
		if (linkitStatusItem != nil) {
			[[NSStatusBar systemStatusBar] removeStatusItem:linkitStatusItem];
		}
		linkitStatusItem = nil;
		linkitStatusMenu = nil;
		linkitTrayTarget = nil;
	});
}
