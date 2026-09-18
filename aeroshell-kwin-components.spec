%define KF6_MIN_VERSION 6.7.0
%define KWIN_VERSION 6.7.90

Name:           aeroshell-kwin-components
Version:        45.0.0
Release:        5%{?dist}
Summary:        AeroShell KWin components for KDE Plasma

License:        AGPL-3.0-only
URL:            https://github.com/evernightvista/aeroshell-kwin-components
Source0:        %{name}.tar.gz

BuildRequires:  cmake >= 3.16
BuildRequires:  ninja-build
BuildRequires:  gcc-c++
BuildRequires:  extra-cmake-modules >= %{KF6_MIN_VERSION}
BuildRequires:  kf6-rpm-macros

# Qt6
BuildRequires:  qt6-qtbase-devel
BuildRequires:  qt6-qtdeclarative-devel
BuildRequires:  qt6-qtsvg-devel
BuildRequires:  qt6-qttools-devel
BuildRequires:  qt6-qtwayland-devel

# KF6
BuildRequires:  kf6-kconfig-devel >= %{KF6_MIN_VERSION}
BuildRequires:  kf6-kconfigwidgets-devel >= %{KF6_MIN_VERSION}
BuildRequires:  kf6-kcoreaddons-devel >= %{KF6_MIN_VERSION}
BuildRequires:  kf6-kcrash-devel >= %{KF6_MIN_VERSION}
BuildRequires:  kf6-ki18n-devel >= %{KF6_MIN_VERSION}
BuildRequires:  kf6-kio-devel >= %{KF6_MIN_VERSION}
BuildRequires:  kf6-kservice-devel >= %{KF6_MIN_VERSION}
BuildRequires:  kf6-knotifications-devel >= %{KF6_MIN_VERSION}
BuildRequires:  kf6-kwidgetsaddons-devel >= %{KF6_MIN_VERSION}
BuildRequires:  kf6-kwindowsystem-devel >= %{KF6_MIN_VERSION}
BuildRequires:  kf6-kguiaddons-devel >= %{KF6_MIN_VERSION}
BuildRequires:  kf6-kcmutils-devel >= %{KF6_MIN_VERSION}
BuildRequires:  kf6-ksvg-devel >= %{KF6_MIN_VERSION}

# KWin
BuildRequires:  kwin-devel
BuildRequires:  qt6-qtbase-private-devel
BuildRequires:  kdecoration-devel

# Other
BuildRequires:  wayland-protocols-devel >= 1.48
BuildRequires:  vulkan-headers
BuildRequires:  pkgconfig
BuildRequires:  libepoxy-devel
BuildRequires:  libdrm-devel

# Runtime
Requires:       kwin >= %{KWIN_VERSION}
Requires:       plasma-workspace-wayland

%description
AeroShell KWin components for KDE Plasma. Contains KWin effects,
scripts, tab switchers, and other components for AeroShell-based desktops.

This package provides Wayland-only support for KDE Plasma 6.8+.

%package devel
Summary:        Development files for %{name}
Requires:       %{name}%{?_isa} = %{version}-%{release}

%description devel
Development files for %{name}.

%prep
%autosetup -n %{name} -p1

%build
%cmake_kf6 \
    -G Ninja \
    -DKWIN_INSTALL_MISC=ON \
    -DBUILD_TESTING=OFF

%cmake_build

%install
%cmake_install

%find_lang %{name} --all-name

%files -f %{name}.lang
%license LICENSE
%doc README.md
%{_bindir}/aeroshell_update_default_rules
%{_qt6_plugindir}/kwin/effects/plugins/aeroglassblur.so
%{_qt6_plugindir}/kwin/effects/plugins/aeroglide.so
%{_qt6_plugindir}/kwin/effects/configs/kwin_aeroglassblur_config.so
%{_qt6_plugindir}/kwin/effects/configs/kwin_aeroglide_config.so
%{_datadir}/kwin/
%{_datadir}/smod/
%{_datadir}/aeroshell/

%changelog
* Sat Sep 19 2026 KairikiFedora <13278297951@sina.cn> - 45.0.0-5
- Remove Launch Animation and Smodsnap

* Tue Sep 15 2026 KairikiFedora <13278297951@sina.cn> - 45.0.0-4
- Final Support KDE Plasma 6.8 Beta 1 or later

* Sun Sep 13 2026 KairikiFedora <13278297951@sina.cn> - 45.0.0-3
- Fix kwin_wayland crash when opening KCM settings or after applying settings
- Fix signal connection leaks in aeroglassblur effect (dangling pointers on window close)
- Properly disconnect all window signals when windows are deleted
- Fix decoration blurRegionChanged connection leaks
- Remove event filter from internal windows properly
- Add null pointer safety checks for blurItem
- Adapt for Plasma 6.7.90+ (KDE Plasma 6.8 Beta 1) compatibility
- Bump minimum KWin version to 6.7.90

* Sat Sep 12 2026 KairikiFedora <13278297951@sina.cn> - 45.0.0-2
- Fix Dark Mode lost color

* Fri Sep 11 2026 KairikiFedora <13278297951@sina.cn> - 45.0.0-1
- Update to Plasma 6.8 compatibility
- Drop X11 support, Wayland only
- Bump version to 45.0.0
