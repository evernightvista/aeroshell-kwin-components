/*
 * SPDX-FileCopyrightText: 2024 Souris
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

#include "smodsnap.h"
#include "smod.h"

#include <KDecoration3/Decoration>
#include <KDecoration3/DecoratedWindow>

static void ensureResources()
{
    Q_INIT_RESOURCE(smodsnap);
}

namespace KWin
{

SmodSnapEffect::SmodSnapEffect()
{
    connect(effects, &EffectsHandler::windowAdded, this, &SmodSnapEffect::windowAdded);

    reconfigure(ReconfigureAll);

    // NOTE is this needed?
    //effects->makeOpenGLContextCurrent();

    anim1 = new SnapAnimation();
    anim2 = new SnapAnimation();

    loadTextures();

    // Use a timer to poll for outline visibility changes.
    // In Plasma 6.8+, the outline window is reused (shown/hidden) rather than
    // created/destroyed each time, so windowAdded only fires once.
    // We can't rely on prePaintScreen for detection because prePaintScreen
    // may not be called when the effect is inactive.
    m_outlineCheckTimer = new QTimer(this);
    m_outlineCheckTimer->setInterval(50); // 20 Hz polling
    m_outlineCheckTimer->setSingleShot(false);
    connect(m_outlineCheckTimer, &QTimer::timeout, this, &SmodSnapEffect::checkOutlineVisibility);

    // Initialize visibility state
    m_outlineWasVisible = hasVisibleOutline();

    m_outlineCheckTimer->start();
}

SmodSnapEffect::~SmodSnapEffect()
{
    if (m_outlineCheckTimer) {
        m_outlineCheckTimer->stop();
    }

    if (anim1) {
        delete anim1;
    }

    if (anim2) {
        delete anim2;
    }
}

bool SmodSnapEffect::supported()
{
    return effects->isOpenGLCompositing() && SMOD::resourceExists(QStringLiteral("snapeffecttextures"));
}

void SmodSnapEffect::reconfigure(Effect::ReconfigureFlags flags)
{
    Q_UNUSED(flags)

    SMOD::registerResource(QStringLiteral("snapeffecttextures"));

    if (effects->compositingType() == OpenGLCompositing) {
        ensureResources();
    }
}

void SmodSnapEffect::windowAdded(KWin::EffectWindow *w)
{
    // Fallback for older Plasma versions where outline window is
    // created/destroyed each time snap is triggered.
    if (w->isOutline()) {
        playSnapAnimation();
    }
}

bool SmodSnapEffect::hasVisibleOutline() const
{
    const auto windows = effects->stackingOrder();
    for (const EffectWindow *w : windows) {
        if (w->isOutline()) {
            return true;
        }
    }
    return false;
}

void SmodSnapEffect::checkOutlineVisibility()
{
    const bool outlineVisible = hasVisibleOutline();
    if (outlineVisible && !m_outlineWasVisible) {
        playSnapAnimation();
    }
    m_outlineWasVisible = outlineVisible;
}

void SmodSnapEffect::playSnapAnimation()
{
    if (m_frames <= 0 || m_speed <= 0 || m_texture.empty()) {
        return;
    }

    if (!anim1->m_active) {
        anim1->m_active = true;
        anim1->m_finished = false;
        anim1->m_frame = 0;
        anim1->m_progress = 0;
        anim1->m_clock.reset();

        const QPoint framesize = m_size * m_scale;
        const QPoint pos = effects->cursorPos().toPoint() - (framesize / 2);
        anim1->m_rect = Rect(pos, QSize(framesize.x(), framesize.y()));
        effects->addRepaint(anim1->m_rect);
    } else if (!anim2->m_active) {
        anim2->m_active = true;
        anim2->m_finished = false;
        anim2->m_frame = 0;
        anim2->m_progress = 0;
        anim2->m_clock.reset();

        const QPoint framesize = m_size * m_scale;
        const QPoint pos = effects->cursorPos().toPoint() - (framesize / 2);
        anim2->m_rect = Rect(pos, QSize(framesize.x(), framesize.y()));
        effects->addRepaint(anim2->m_rect);
    }
}

void SmodSnapEffect::prePaintScreen(ScreenPrePaintData &data)
{
    if (m_frames <= 0 || m_speed <= 0) {
        anim1->m_active = false;
        anim2->m_active = false;
        effects->prePaintScreen(data);
        return;
    }

    if (anim1->m_active) {
        const int time = anim1->m_clock.tick(data.view).count();

        // NOTE we need to do (m_frames + 1) here so the last frame
        // will play for the same amount of time as the rest
        anim1->m_progress = (anim1->m_progress + time) % (m_speed * (m_frames + 1));
        anim1->m_frame = (int)((qreal)anim1->m_progress / (qreal)m_speed) % (m_frames + 1);

        if (anim1->m_frame == m_frames) {
            anim1->m_finished = true;
        } else {
            data.paint = data.paint.united(anim1->m_rect);
        }
    }

    if (anim2->m_active) {
        const int time = anim2->m_clock.tick(data.view).count();

        // NOTE we need to do (m_frames + 1) here so the last animation frame
        // will play for the same amount of time as the rest
        anim2->m_progress = (anim2->m_progress + time) % (m_speed * (m_frames + 1));
        anim2->m_frame = qRound((qreal)anim2->m_progress / (qreal)m_speed) % (m_frames + 1);

        if (anim2->m_frame == m_frames) {
            anim2->m_finished = true;
        } else {
            data.paint = data.paint.united(anim2->m_rect);
        }
    }

    effects->prePaintScreen(data);
}

void SmodSnapEffect::postPaintScreen()
{
    if (anim1->m_active) {
        effects->addRepaint(anim1->m_rect);

        if (anim1->m_finished) {
            anim1->m_active = false;
        }
    }

    if (anim2->m_active) {
        effects->addRepaint(anim2->m_rect);

        if (anim2->m_finished) {
            anim2->m_active = false;
        }
    }

    effects->postPaintScreen();
}

}
