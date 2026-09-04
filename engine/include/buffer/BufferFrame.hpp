#pragma once

#include "BufferPage.hpp"

class BufferFrame {
private:
    int frameId;
    BufferPage page;

    bool valid;
    bool dirty;
    int pinCount;

public:
    BufferFrame(int frameId = -1)
        : frameId(frameId),
          page(),
          valid(false),
          dirty(false),
          pinCount(0) {}

    int getFrameId() const {
        return frameId;
    }

    int getPageId() const {
        return page.getPageId();
    }

    BufferPage& getPage() {
        return page;
    }

    bool isValid() const {
        return valid;
    }

    bool isDirty() const {
        return dirty;
    }

    int getPinCount() const {
        return pinCount;
    }

    void loadPage(const BufferPage& newPage) {
        page = newPage;
        valid = true;
        dirty = false;
        pinCount = 0;
    }

    void setDirty(bool value) {
        dirty = value;
    }

    void pin() {
        pinCount++;
    }

    void unpin() {
        if (pinCount > 0) {
            pinCount--;
        }
    }

    void clear() {
        page = BufferPage();
        valid = false;
        dirty = false;
        pinCount = 0;
    }
};