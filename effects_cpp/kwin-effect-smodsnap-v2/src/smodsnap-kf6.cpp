/*
 * SPDX-FileCopyrightText: 2024 Souris
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

#include "smodsnap.h"

#include <KConfig>
#include <KConfigGroup>
#include <QPixmap>

#include <cmath>
#include <cstddef>
#include <utility>

namespace KWin
{

void SmodSnapEffect::loadTextures()
{
    KConfig config(QStringLiteral(":/effects/smodsnap/animation/animrc"));
    KConfigGroup generalGroup(&config, QStringLiteral("General"));

    m_frames   = generalGroup.readEntry("frames", 0);
    m_speed    = generalGroup.readEntry("speed",  0);
    m_scale    = generalGroup.readEntry("scale",  1.0);
    int width  = generalGroup.readEntry("width",  0);
    int height = generalGroup.readEntry("height", 0);
    m_size     = QPoint(width, height);

    m_texture.clear();
    if (m_frames <= 0 || m_speed <= 0 || m_size.isNull() || !std::isfinite(m_scale) || m_scale <= 0) {
        m_frames = 0;
        return;
    }

    m_texture.resize(m_frames);

    for (int i = 0; i < m_frames; ++i) {
        const QPixmap pixmap(QStringLiteral(":/effects/smodsnap/animation/frame") + QString::number(i + 1));
        auto texture = GLTexture::upload(pixmap);
        if (!texture || texture->isNull()) {
            m_texture.clear();
            m_frames = 0;
            return;
        }
        texture->setFilter(GL_LINEAR);
        texture->setWrapMode(GL_CLAMP_TO_EDGE);
        m_texture[i] = std::move(texture);
    }
}

bool SmodSnapEffect::paintScreen(const RenderTarget &renderTarget, const RenderViewport &viewport, int mask, const Region &region, LogicalOutput *screen)
{
    const bool ok = effects->paintScreen(renderTarget, viewport, mask, region, screen);
    if (!ok) {
        return false;
    }

    if (m_frames <= 0 || m_texture.size() != static_cast<std::size_t>(m_frames)) {
        return ok;
    }

    const auto canPaint = [this](const SnapAnimation *animation) {
        if (!animation->m_active || animation->m_finished || animation->m_frame < 0 || animation->m_frame >= m_frames) {
            return false;
        }
        const GLTexture *texture = m_texture[animation->m_frame].get();
        return texture && !texture->isNull();
    };
    if (!canPaint(anim1) && !canPaint(anim2)) {
        return ok;
    }

    GLShader *shader = ShaderManager::instance()->pushShader(ShaderTrait::MapTexture);
    if (!shader) {
        return ok;
    }

    glEnable(GL_BLEND);
    glBlendFunc(GL_ONE, GL_ONE_MINUS_SRC_ALPHA);

    const auto scale = viewport.scale();
    const auto paintAnimation = [&](const SnapAnimation *animation) {
        if (!canPaint(animation)) {
            return;
        }
        const QRectF pixelGeometry = snapToPixels(animation->m_rect, scale).scaled(scale);
        QMatrix4x4 mvp = viewport.projectionMatrix();
        mvp.translate(pixelGeometry.x(), pixelGeometry.y());
        shader->setUniform(GLShader::Mat4Uniform::ModelViewProjectionMatrix, mvp);
        m_texture[animation->m_frame]->render(pixelGeometry.size());
    };

    paintAnimation(anim1);
    paintAnimation(anim2);

    ShaderManager::instance()->popShader();
    glDisable(GL_BLEND);

    return ok;
}

}
