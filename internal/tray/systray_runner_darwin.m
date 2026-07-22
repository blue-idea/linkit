#import <Cocoa/Cocoa.h>
#import <dispatch/dispatch.h>
#include <stdbool.h>

extern void linkitDarwinTrayMenuSelected(int menuID);

@interface LinkitTrayTarget : NSObject
@end

@implementation LinkitTrayTarget
- (void)handleMenuItem:(NSMenuItem *)sender {
	linkitDarwinTrayMenuSelected((int)sender.tag);
}
@end

static NSStatusItem *linkitStatusItem;
static NSMenu *linkitStatusMenu;
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

		linkitStatusItem.menu = linkitStatusMenu;
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
