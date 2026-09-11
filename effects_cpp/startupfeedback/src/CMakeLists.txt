#######################################
# Effect

# Source files
set(startupfeedback_SOURCES
    main.cpp
    startupfeedback.cpp
    startupfeedback.qrc
)

add_library(launchfeedback MODULE ${startupfeedback_SOURCES})

target_link_libraries(launchfeedback PRIVATE
    KF6::ConfigCore
    KF6::ConfigGui
    Qt::DBus
    Qt::Widgets
    KF6::WindowSystem
    KWin::kwin
)

install(TARGETS launchfeedback DESTINATION ${KDE_INSTALL_PLUGINDIR}/kwin/effects/plugins)
