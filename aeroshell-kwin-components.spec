%define KF6_MIN_VERSION 6.3.0

Name:           aeroshell-kwin-components
Version:        6.8.0
Release:        2%{?dist}
Summary:        AeroShell KWin components for KDE Plasma

License:        AGPL-3.0-only
URL:            https://github.com/evernightvista/aeroshell-kwin-components
Source0:        %{name}-%{version}.tar.gz

BuildRequires:  cmake >= 3.16
BuildRequires:  ninja
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
BuildRequires:  kwin-devel >= 6.8.0
BuildRequires:  kdecoration3-devel
BuildRequires:  kwin-effects-devel

# Other
BuildRequires:  epoxy-devel
BuildRequires:  wayland-protocols-devel >= 1.48
BuildRequires:  vulkan-headers
BuildRequires:  pkgconfig

# Runtime
Requires:       kwin >= 6.8.0
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
%autosetup -p1

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
%{_kf6_plugindir}/kwin/effects/plugins/*.so
%{_kf6_plugindir}/kwin/effects/configs/*.so
%{_datadir}/kwin/
%{_datadir}/smod/
%{_datadir}/aeroshell/

%changelog
* Fri Sep 11 2026 AeroShell Team <team@aeroshell.dev> - 6.8.0-2
- Fix taskbar/start menu colorization at session start when "Follow KDE
  Plasma accent color" is enabled: the "kwinaero" shared memory segment now
  carries a write timestamp and stale segments from a previous session are
  ignored, so kwinrc is authoritative at startup
- The effect now watches kdeglobals with KConfigWatcher and follows accent
  color changes immediately, without opening the effect settings first
- Startup retries re-apply accent following if kdeglobals was not final yet

* Wed Sep 09 2026 AeroShell Team <team@aeroshell.dev> - 6.8.0-1
- Update to Plasma 6.8 compatibility
- Drop X11 support, Wayland only
- Bump version to 6.8.0
