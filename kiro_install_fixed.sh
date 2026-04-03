#!/usr/bin/env bash
#
# Cleaned up installation script for Kiro

# Symlink bin command to /usr/bin
rm -f /usr/bin/kiro
ln -s /usr/share/kiro/bin/kiro /usr/bin/kiro

# Register kiro in the alternatives system as an editor
update-alternatives --install /usr/bin/editor editor /usr/bin/kiro 0

# Install the desktop entry
if hash update-desktop-database 2>/dev/null; then
	update-desktop-database
fi

# Update mimetype database to pickup workspace mimetype
if hash update-mime-database 2>/dev/null; then
	update-mime-database /usr/share/mime
fi
